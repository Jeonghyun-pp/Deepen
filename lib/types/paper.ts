export interface Paper {
  id: string; // OpenAlex ID (e.g., "W2741809807")
  title: string;
  abstract: string | null;
  authors: Author[];
  year: number | null;
  citationCount: number;
  fields: string[];
  doi: string | null;
  pdfUrl: string | null;
  openAccess: boolean;
  openalexId: string;
}

export interface Author {
  name: string;
  institution: string | null;
}

export interface PaperSearchResult {
  papers: Paper[];
  totalCount: number;
  page: number;
  perPage: number;
}
