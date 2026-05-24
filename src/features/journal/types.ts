export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalInput {
  title: string;
  body: string;
  createdAt?: string;
}
