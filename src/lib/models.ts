export type MediaType = "image" | "video";

export interface ImageDoc {
  _id?: string;
  imagePath: string;
  prompt: string;
  model: string;
  channel: string;
  userId: string;
  userName?: string;
  brandId: string;
  brandName?: string;
  timeStamp: string;
  mediaType: MediaType;
  width?: number;
  height?: number;
}

export interface EvaluationDoc {
  _id?: string;
  imageId: string;
  sizeCompliance: number;
  subjectAdherence: number;
  creativity: number;
  moodConsistency: number;
  endScore: number;
  createdAt: string;
}

export interface AdminUser {
  _id?: string;
  username: string;
  passwordHash: string;
}
