import { eq } from 'drizzle-orm';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { importJobs } from '../../src/modules/imports/schema/import-jobs.js';
import { media } from '../../src/modules/media/schema/media.js';
import { ttsClips } from '../../src/modules/media/schema/tts-clips.js';
import { noteMedia } from '../../src/modules/notes/schema/note-media.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { users } from '../../src/modules/users/schema/users.js';
import {
  PG,
  createMedia,
  createNoteWithCard,
  createUserWithContent,
  expectPgError,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();
const hash = (c: string) => c.repeat(64);

describe('media', () => {
  it('stores a file once per user by sha256', async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);
    await createMedia(t.db, { userId: a.user.id, sha256: hash('a') });

    await expectPgError(
      createMedia(t.db, { userId: a.user.id, sha256: hash('a') }),
      PG.uniqueViolation,
    );
    // Another user may hold the same file.
    await expect(
      createMedia(t.db, { userId: b.user.id, sha256: hash('a') }),
    ).resolves.toBeDefined();
  });

  it("rejects a note_media link to another user's media", async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);
    const { note } = await createNoteWithCard(t.db, a);
    const mediaA = await createMedia(t.db, { userId: a.user.id });
    const mediaB = await createMedia(t.db, { userId: b.user.id });

    await expectPgError(
      t.db
        .insert(noteMedia)
        .values({ userId: a.user.id, noteId: note.id, mediaId: mediaB.id }),
      PG.foreignKeyViolation,
    );
    await expect(
      t.db
        .insert(noteMedia)
        .values({ userId: a.user.id, noteId: note.id, mediaId: mediaA.id }),
    ).resolves.toBeDefined();
  });

  it('deleting a note or a media row deletes its links', async () => {
    const a = await createUserWithContent(t.db);
    const first = await createNoteWithCard(t.db, a);
    const second = await createNoteWithCard(t.db, a);
    const image = await createMedia(t.db, { userId: a.user.id });
    const audio = await createMedia(t.db, { userId: a.user.id });
    await t.db.insert(noteMedia).values([
      { userId: a.user.id, noteId: first.note.id, mediaId: image.id },
      { userId: a.user.id, noteId: second.note.id, mediaId: image.id },
      { userId: a.user.id, noteId: second.note.id, mediaId: audio.id },
    ]);
    const links = () =>
      t.db
        .select({ noteId: noteMedia.noteId, mediaId: noteMedia.mediaId })
        .from(noteMedia);

    await t.db.delete(notes).where(eq(notes.id, first.note.id));
    expect(await links()).toHaveLength(2);

    await t.db.delete(media).where(eq(media.id, image.id));
    expect(await links()).toEqual([
      { noteId: second.note.id, mediaId: audio.id },
    ]);
  });

  it('keeps tts_clips when a user is deleted', async () => {
    const a = await createUserWithContent(t.db);
    await t.db.insert(ttsClips).values({
      hash: hash('c'),
      lang: 'es',
      voice: 'Lucia',
      s3Key: `tts/${hash('c')}.mp3`,
    });

    await t.db.delete(users).where(eq(users.id, a.user.id));

    expect(await t.db.select().from(ttsClips)).toHaveLength(1);
  });
});

describe('import_jobs', () => {
  it('rejects an unknown format', async () => {
    const a = await createUserWithContent(t.db);
    await expectPgError(
      t.db.insert(importJobs).values({
        userId: a.user.id,
        s3Key: 'imports/deck.xlsx',
        // @ts-expect-error -- not one of the import formats
        format: 'xlsx',
      }),
      PG.checkViolation,
    );
  });

  it('keeps the job when its deck is deleted, with deck_id cleared', async () => {
    const a = await createUserWithContent(t.db);
    const [job] = await t.db
      .insert(importJobs)
      .values({
        userId: a.user.id,
        deckId: a.deck.id,
        s3Key: 'imports/deck.apkg',
        format: 'apkg',
      })
      .returning();
    expect(job.status).toBe('pending');

    await t.db.delete(decks).where(eq(decks.id, a.deck.id));

    const [after] = await t.db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, job.id));
    expect(after.deckId).toBeNull();
  });
});
