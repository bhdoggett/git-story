interface CachedStory {
  id: string;
  repoId: string;
  repoName: string;
  createdAt: string;
  chapters: Array<{
    id: string;
    title: string;
    summary: string;
    userNotes?: string;
    commitShas: string[];
    commitCount: number;
    createdAt: string;
    updatedAt: string;
    commitDateRange?: string;
  }>;
  lastUpdated: number;
  expiresAt: number;
}

interface CachedChapterCommits {
  chapterId: string;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
    diff: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
      patch?: string;
    }>;
  }>;
  lastUpdated: number;
  expiresAt: number;
}

class StoryCache {
  private dbName = "GitStoryCache";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stories store
        if (!db.objectStoreNames.contains("stories")) {
          const storiesStore = db.createObjectStore("stories", {
            keyPath: "repoId",
          });
          storiesStore.createIndex("lastUpdated", "lastUpdated", {
            unique: false,
          });
        }

        // Create chapter commits store
        if (!db.objectStoreNames.contains("chapterCommits")) {
          const commitsStore = db.createObjectStore("chapterCommits", {
            keyPath: "chapterId",
          });
          commitsStore.createIndex("lastUpdated", "lastUpdated", {
            unique: false,
          });
        }
      };
    });
  }

  async getStory(repoId: string): Promise<CachedStory | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stories"], "readonly");
      const store = transaction.objectStore("stories");
      const request = store.get(repoId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const story = request.result as CachedStory;
        if (story && story.expiresAt > Date.now()) {
          resolve(story);
        } else {
          // Remove expired story
          if (story) {
            this.deleteStory(repoId);
          }
          resolve(null);
        }
      };
    });
  }

  async setStory(story: CachedStory): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stories"], "readwrite");
      const store = transaction.objectStore("stories");
      const request = store.put(story);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteStory(repoId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["stories"], "readwrite");
      const store = transaction.objectStore("stories");
      const request = store.delete(repoId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getChapterCommits(
    chapterId: string
  ): Promise<CachedChapterCommits | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["chapterCommits"], "readonly");
      const store = transaction.objectStore("chapterCommits");
      const request = store.get(chapterId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cached = request.result as CachedChapterCommits;
        if (cached && cached.expiresAt > Date.now()) {
          resolve(cached);
        } else {
          // Remove expired cache
          if (cached) {
            this.deleteChapterCommits(chapterId);
          }
          resolve(null);
        }
      };
    });
  }

  async setChapterCommits(chapterId: string, commits: any[]): Promise<void> {
    if (!this.db) await this.init();

    const cached: CachedChapterCommits = {
      chapterId,
      commits,
      lastUpdated: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["chapterCommits"], "readwrite");
      const store = transaction.objectStore("chapterCommits");
      const request = store.put(cached);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteChapterCommits(chapterId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["chapterCommits"], "readwrite");
      const store = transaction.objectStore("chapterCommits");
      const request = store.delete(chapterId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpired(): Promise<void> {
    if (!this.db) await this.init();

    const now = Date.now();

    // Clear expired stories
    const storiesTransaction = this.db!.transaction(["stories"], "readwrite");
    const storiesStore = storiesTransaction.objectStore("stories");
    const storiesIndex = storiesStore.index("lastUpdated");
    const storiesRequest = storiesIndex.openCursor();

    storiesRequest.onsuccess = () => {
      const cursor = storiesRequest.result;
      if (cursor) {
        const story = cursor.value as CachedStory;
        if (story.expiresAt <= now) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    // Clear expired chapter commits
    const commitsTransaction = this.db!.transaction(
      ["chapterCommits"],
      "readwrite"
    );
    const commitsStore = commitsTransaction.objectStore("chapterCommits");
    const commitsIndex = commitsStore.index("lastUpdated");
    const commitsRequest = commitsIndex.openCursor();

    commitsRequest.onsuccess = () => {
      const cursor = commitsRequest.result;
      if (cursor) {
        const cached = cursor.value as CachedChapterCommits;
        if (cached.expiresAt <= now) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}

export const storyCache = new StoryCache();

// Helper function to calculate date range from commits
export function calculateDateRange(commits: any[]): string {
  if (!commits || commits.length === 0) return "";

  const dates = commits.map((commit) => new Date(commit.date));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

  if (earliest.toDateString() === latest.toDateString()) {
    return earliest.toLocaleDateString();
  } else {
    return `${earliest.toLocaleDateString()} - ${latest.toLocaleDateString()}`;
  }
}
