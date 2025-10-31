export type MediaType = "image" | "video";

export type EvaluationLite = {
  endScore: number;
  sizeCompliance: number;
  subjectAdherence: number;
  creativity: number;
  moodConsistency: number;
};

export type Item = {
  _id: string;
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
  latestEval?: EvaluationLite;
};

// Server models
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

export type BrandInfo = {
  brandName?: string;
  brandDescription?: string;
  brandVision?: string;
  brandVoice?: string;
  colors?: string;
  style?: string;
};

export interface AdminUser {
  _id?: string;
  username: string;
  passwordHash: string;
}
