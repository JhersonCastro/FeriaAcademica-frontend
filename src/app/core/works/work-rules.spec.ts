import { WorkArtifactDto } from '../models/work';
import {
  artifactRows,
  canReplace,
  decisionError,
  isDeadlinePassed,
  isHttpUrl,
  reviewsNewestFirst,
} from './work-rules';

function artifact(type: WorkArtifactDto['type'], version: number): WorkArtifactDto {
  return {
    id: `${type}-${version}`,
    type,
    version,
    fileUrl: null,
    linkUrl: `https://example.org/${type}/${version}`,
    uploadedAt: '2026-10-28T12:00:00Z',
  };
}

describe('artifactRows', () => {
  it('marks only the highest version of each type as current', () => {
    const rows = artifactRows([artifact('Document', 1), artifact('Video', 1), artifact('Document', 2)]);

    expect(rows.map((row) => [row.type, row.version, row.current])).toEqual([
      ['Document', 2, true],
      ['Document', 1, false],
      ['Video', 1, true],
    ]);
  });

  it('returns an empty list when there are no artifacts', () => {
    expect(artifactRows([])).toEqual([]);
  });
});

describe('reviewsNewestFirst', () => {
  it('orders reviews by attempt, newest first', () => {
    const reviews = reviewsNewestFirst([
      { attempt: 1, result: 'Rejected', observations: 'a', resolvedAt: null },
      { attempt: 2, result: 'Admitted', observations: null, resolvedAt: null },
    ]);
    expect(reviews.map((review) => review.attempt)).toEqual([2, 1]);
  });
});

describe('isDeadlinePassed', () => {
  const now = new Date('2026-10-30T12:00:00Z');

  it('is false without a deadline', () => {
    expect(isDeadlinePassed(null, now)).toBe(false);
  });

  it('compares against the deadline', () => {
    expect(isDeadlinePassed('2026-10-31T04:59:00Z', now)).toBe(false);
    expect(isDeadlinePassed('2026-10-29T23:59:00Z', now)).toBe(true);
  });
});

describe('canReplace', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  const open = '2026-11-05T00:00:00Z';
  const closed = '2026-10-01T00:00:00Z';

  it.each(['Draft', 'Submitted'] as const)('allows %s before the deadline', (status) => {
    expect(canReplace(status, open, now)).toBe(true);
  });

  it('blocks every status after the deadline (HU-012 criterion 3)', () => {
    expect(canReplace('Draft', closed, now)).toBe(false);
    expect(canReplace('Submitted', closed, now)).toBe(false);
  });

  it.each(['InReview', 'Admitted', 'RejectedDefinitively', 'Cancelled'] as const)(
    'blocks %s even with time left',
    (status) => {
      expect(canReplace(status, open, now)).toBe(false);
    },
  );
});

describe('decisionError (HU-021)', () => {
  it('requires a decision', () => {
    expect(decisionError(null, 'algo')).toBe('Selecciona una decisión.');
  });

  it('lets an approval go without feedback', () => {
    expect(decisionError('Approved', '')).toBeNull();
  });

  it.each(['ApprovedWithChanges', 'Rejected'] as const)('requires feedback for %s', (decision) => {
    expect(decisionError(decision, '   ')).not.toBeNull();
    expect(decisionError(decision, 'Incluye la calibración de los sensores.')).toBeNull();
  });
});

describe('isHttpUrl', () => {
  it.each(['https://drive.google.com/file/d/1', 'http://example.org/a.pdf'])('accepts %s', (url) => {
    expect(isHttpUrl(url)).toBe(true);
  });

  it.each(['', 'drive.google.com/file', 'ftp://example.org/a.pdf', 'javascript:alert(1)'])(
    'rejects "%s"',
    (url) => {
      expect(isHttpUrl(url)).toBe(false);
    },
  );
});
