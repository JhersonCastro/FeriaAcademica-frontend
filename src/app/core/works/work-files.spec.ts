import { MAX_FILE_BYTES, fileError, fileSizeLabel } from './work-rules';

describe('uploaded artifact files (HU-015)', () => {
  it('accepts a PDF within the size limit', () => {
    expect(fileError({ name: 'trabajo.pdf', size: 2_000_000 })).toBeNull();
    expect(fileError({ name: 'TRABAJO.PDF', size: MAX_FILE_BYTES })).toBeNull();
  });

  it('rejects anything that is not a PDF', () => {
    expect(fileError({ name: 'trabajo.docx', size: 1000 })).toBe('Solo se aceptan archivos PDF.');
    expect(fileError({ name: 'pdf', size: 1000 })).toBe('Solo se aceptan archivos PDF.');
  });

  it('rejects an empty file and one over the limit', () => {
    expect(fileError({ name: 'a.pdf', size: 0 })).toBe('El archivo está vacío.');
    expect(fileError({ name: 'a.pdf', size: MAX_FILE_BYTES + 1 })).toBe(
      'El archivo supera el tamaño máximo de 10 MB.',
    );
  });

  it('shows the size in KB or MB', () => {
    expect(fileSizeLabel(340 * 1024)).toBe('340 KB');
    expect(fileSizeLabel(1)).toBe('1 KB');
    expect(fileSizeLabel(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });
});
