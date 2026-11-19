export type Deck = {
  id: number;
  title: string;
  subject: string;
  description: string;
  color: string;
  createdAt: string;
};

export type DeckWithStats = Deck & {
  total: number;
  due: number;
  mastered: number;
};

export type CardRow = {
  id: number;
  deckId: number;
  front: string;
  back: string;
  box: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
};

export type MindMapRow = {
  id: number;
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
};

export type MapNodeRow = {
  id: number;
  mapId: number;
  parentId: number | null;
  label: string;
  x: number;
  y: number;
  color: string;
};

export type MapWithNodes = MindMapRow & {
  nodes: MapNodeRow[];
};

export type NoteRow = {
  id: number;
  title: string;
  content: string;
  subject: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MapNodeSummary = {
  id: number;
  parentId: number | null;
  label: string;
  color: string;
};

export type MapSummary = {
  id: number;
  title: string;
  subject: string;
  nodes: MapNodeSummary[];
};

/** A connection between a mind-map node and a card or note. */
export type LinkRow = {
  id: number;
  nodeId: number;
  nodeLabel: string;
  nodeColor: string;
  mapId: number;
  mapTitle: string;
  cardId: number | null;
  noteId: number | null;
};

export type LinkedCard = CardRow & { linkId: number };
export type LinkedNote = NoteRow & { linkId: number };

export type NodeLinks = {
  cards: LinkedCard[];
  notes: LinkedNote[];
};

export type DeckPicker = {
  id: number;
  title: string;
  color: string;
  cards: { id: number; front: string }[];
};

export type Stats = {
  dueToday: number;
  totalCards: number;
  mastered: number;
  decks: number;
  maps: number;
  notes: number;
  streak: number;
  reviewedToday: number;
};
