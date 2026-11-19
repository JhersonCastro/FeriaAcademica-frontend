# Tarea para el back: los certificados (y el informe en PDF) fallan con 500 en Docker por falta de fuentes

Este documento está pensado para dárselo a Claude Code abierto en la carpeta de `FeriaAcademica-backend`. Contiene el contexto, lo que hay que hacer, lo que no hay que tocar y cómo comprobarlo.

## Problema

Cuando la API corre en Docker (con el `Dockerfile` del back), descargar un certificado devuelve **500** y el front muestra "No pudimos descargar el certificado. Si el problema sigue, escribe a la organización de la feria."

```
GET /api/certificates/events/{eventId}/Attendance/pdf  ->  500
System.NullReferenceException: Object reference not set to an instance of an object.
   at PdfSharp.Fonts.OpenType.OpenTypeFontFace.CetOrCreateFrom(XFontSource fontSource)
   at PdfSharp.Drawing.XGlyphTypeface..ctor(...)
   at PdfSharp.Drawing.XFont..ctor(String familyName, Double emSize, XFontStyleEx style)
   at FeriaAcademica.Infrastructure.Pdf.PdfRenderer.Line(...) in PdfRenderer.cs:line 75
   at FeriaAcademica.Infrastructure.Pdf.PdfRenderer.RenderCertificate(...) in PdfRenderer.cs:line 52
```

Funciona al correr el back en Windows con `dotnet run` (hay Arial), por eso no se notó antes. Es muy probable que la exportación del informe en PDF (`RenderHtml`) falle igual, porque usa el mismo resolvedor de fuentes.

## Causa (ya verificada, incluida la solución)

- `src/FeriaAcademica.Infrastructure/Pdf/SystemFontResolver.cs`: PDFsharp necesita que se le diga dónde están las fuentes. El resolvedor busca, en este orden, **cuatro archivos** de una misma familia (normal, negrita, cursiva y negrita cursiva): `arial*.ttf`, `LiberationSans-{Regular,Bold,Italic,BoldItalic}.ttf` o `DejaVuSans{,-Bold,-Oblique,-BoldOblique}.ttf`, en las carpetas de fuentes del sistema. Si falta **alguno** de los cuatro, descarta la familia entera.
- `Dockerfile` (etapa final, `mcr.microsoft.com/dotnet/aspnet:10.0`): la imagen **no trae ninguna fuente** (`/usr/share/fonts` ni existe). Ninguna familia completa, así que `GetFont` lanza `InvalidOperationException("No sans-serif font was found...")`, PDFsharp devuelve la fuente como `null` y aparece la `NullReferenceException` de arriba.
- Comprobado en un contenedor de prueba: instalar solo `fonts-dejavu-core` **no basta**, porque ese paquete trae `DejaVuSans.ttf` y `DejaVuSans-Bold.ttf` pero **no** las versiones cursiva (`-Oblique`), y el resolvedor exige las cuatro. El paquete que sí trae los cuatro archivos de una familia que el resolvedor reconoce es `fonts-liberation`.
- El nombre de la fuente que se pide en `PdfRenderer` (`"Sans"`) no influye: el resolvedor ignora el nombre y siempre usa la primera familia completa que encuentra.

## Comportamiento esperado

- `GET /api/certificates/events/{eventId}/{type}/pdf` devuelve `200` con un PDF válido también cuando la API corre en el contenedor Docker.
- La exportación del informe en PDF también funciona en Docker.
- Sin cambiar ningún contrato de la API.

## Cómo implementarlo

1. **Mínimo y suficiente: instalar la fuente en la imagen.** En la etapa final del `Dockerfile`, antes de `USER app`, añadir:
   ```dockerfile
   RUN apt-get update \
       && apt-get install -y --no-install-recommends fonts-liberation \
       && rm -rf /var/lib/apt/lists/*
   ```
   Con eso se instalan `LiberationSans-Regular.ttf`, `-Bold.ttf`, `-Italic.ttf` y `-BoldItalic.ttf` en `/usr/share/fonts/truetype/liberation/`, que el resolvedor ya encuentra.
2. **Opcional (más robusto):** que `SystemFontResolver` no descarte una familia por faltar solo la cursiva, usando la normal o la negrita como respaldo. Y que, si no hay ninguna fuente, el error sea claro en el log y el endpoint responda con un mensaje útil en vez de un `NullReferenceException` de PDFsharp.
3. Comprobar que ninguna otra imagen o script del back (por ejemplo un `docker-compose` propio o el despliegue en la VM) construye una imagen distinta sin esa línea.

## Pruebas que hay que añadir o ajustar

- Una prueba que genere un certificado con `RenderCertificate` y compruebe que devuelve bytes que empiezan por `%PDF`. Si la suite corre en un entorno sin fuentes, esa prueba debe fallar con un mensaje claro y no pasar en falso.
- Si el informe en PDF tiene prueba, comprobar que también devuelve `%PDF`.
- Verificar la imagen Docker: construirla y descargar un certificado desde un contenedor (ver "Cómo comprobarlo a mano").

Ejecutar toda la suite (`dotnet test`) antes de terminar. Si `dotnet watch` está corriendo, bloquea las DLL: pararlo antes de compilar o probar.

## Qué NO tocar

- El diseño del certificado (texto, tamaños, posiciones) ni el contenido de `RenderCertificate`.
- Las reglas de quién puede descargar cada tipo de certificado ni cuándo (`CertificateEligibility`).
- El nombre del archivo descargado ni los códigos de certificado.
- Nada del front.

## Cómo comprobarlo a mano

1. Construir la imagen y levantar el entorno con Docker (`docker compose up --build` desde la carpeta padre, o el compose del back).
2. Iniciar sesión como `est1@test.edu.co` (clave de los datos de prueba) y abrir Mis certificados. Debe haber un certificado de asistencia y uno de participación de la Feria Academica 2025 (cerrada).
3. Descargar cada uno: el navegador debe bajar un PDF `certificado-feria-academica-2025-FA-XXXXXXXXXXXX.pdf` que se abra y se lea.
4. Por la API: `GET /api/certificates/events/c0000000-0000-0000-0000-000000000002/Attendance/pdf` con la sesión de `est1` debe responder `200` y `Content-Type: application/pdf`.
5. Antes del arreglo la misma petición responde `500` con la `NullReferenceException` de arriba.

## Notas

- Efecto secundario ya presente: `DownloadCertificateHandler` guarda el certificado (con su código) **antes** de renderizar el PDF. Con el fallo actual, cada intento fallido deja el código emitido aunque el PDF no se generó. No hace falta cambiarlo, pero conviene saberlo al probar.
- Un intento en una feria que no ha terminado responde `400` ("Certificates are available once the event has finished."), que es el comportamiento correcto y no tiene que ver con este problema.

## Entrega

- Rama propia a partir de `main` y Pull Request. Mensaje de commit claro, sin líneas de coautoría.
- Describir en la PR: causa (imagen sin fuentes + resolvedor que exige cuatro archivos), la línea añadida al `Dockerfile` y cómo se comprobó.

## Prompt sugerido para Claude

> Lee `pendiente-back-fuentes-del-certificado.md` y haz la tarea descrita: que la descarga de certificados (y el informe en PDF) funcione en la imagen Docker, instalando `fonts-liberation` en la etapa final del `Dockerfile`. Verifica la causa en el código y reproduce el 500 antes de cambiar nada; construye la imagen y comprueba que un certificado se descarga con `%PDF`. No cambies el diseño del certificado ni las reglas de elegibilidad.
