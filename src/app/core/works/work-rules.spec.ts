import { WorkArtifactDto } from '../models/work';
import {
  artifactRows,
  canReplace,
  canReturnToDraft,
  canSubmitFinalVersion,
  canWithdraw,
  decisionError,
  isDeadlinePassed,
  isHttpUrl,
  reviewsNewestFirst,
  sendRequirements,
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

describe('canSubmitFinalVersion (HU-030)', () => {
  it.each(['Admitted', 'Evaluated'] as const)(
    'allows an approved work (%s) without one',
    (status) => {
      expect(canSubmitFinalVersion(status, [])).toBe(true);
      expect(canSubmitFinalVersion(status, [{ isFinal: false }, {}])).toBe(true);
    },
  );

  it('allows it only once', () => {
    expect(canSubmitFinalVersion('Admitted', [{ isFinal: false }, { isFinal: true }])).toBe(false);
  });

  it.each(['Draft', 'Submitted', 'InReview', 'RejectedDefinitively', 'Cancelled'] as const)(
    'blocks a work that is not approved (%s)',
    (status) => {
      expect(canSubmitFinalVersion(status, [])).toBe(false);
    },
  );
});

describe('canWithdraw', () => {
  it('lets only a draft be withdrawn, which cancels it', () => {
    expect(canWithdraw('Draft')).toBe(true);
    expect(canWithdraw('Submitted')).toBe(false);
    expect(canWithdraw('InReview')).toBe(false);
    expect(canWithdraw('Cancelled')).toBe(false);
  });
});

describe('canReturnToDraft (HU-018)', () => {
  const now = new Date('2026-10-30T12:00:00Z');

  it('allows a submitted work before the deadline', () => {
    expect(canReturnToDraft('Submitted', '2026-11-05T00:00:00Z', now)).toBe(true);
    expect(canReturnToDraft('Submitted', null, now)).toBe(true);
  });

  it('blocks it after the deadline', () => {
    expect(canReturnToDraft('Submitted', '2026-10-01T00:00:00Z', now)).toBe(false);
  });

  it.each(['Draft', 'InReview', 'Admitted', 'RejectedDefinitively', 'Cancelled'] as const)(
    'blocks %s: once a reviewer opens it, it can no longer be withdrawn',
    (status) => {
      expect(canReturnToDraft(status, '2026-11-05T00:00:00Z', now)).toBe(false);
    },
  );
});

describe('sendRequirements (HU-017)', () => {
  const now = new Date('2026-10-30T12:00:00Z');

  it('asks for an artifact and an open call', () => {
    expect(sendRequirements(0, '2026-11-05T00:00:00Z', now).map((item) => item.met)).toEqual([
      false,
      true,
    ]);
    expect(sendRequirements(2, '2026-10-01T00:00:00Z', now).map((item) => item.met)).toEqual([
      true,
      false,
    ]);
  });

  it('is complete with an artifact and no deadline problem', () => {
    expect(sendRequirements(1, null, now).every((item) => item.met)).toBe(true);
  });
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
