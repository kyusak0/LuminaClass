// types/office.ts
export type FileType = 'word' | 'excel' | 'powerpoint' | 'txt';

export type ExcelCell = {
  value: string;
  formula?: string;
};

export type SlideElement = {
  id: string;
  type: 'text' | 'image';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  imageName?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
};

export type Slide = {
  id: number;
  title: string;
  elements: SlideElement[];
  background?: string;
};

export type ImageItem = {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  name: string;
};

export interface ContentBlock {
    index: number;
    type: 'text' | 'image';
    content: string;
    style?: any;
}

export type OfficeFile = {
  id: string;
  serverId?:number
  name: string;
  type: FileType;
  content: any;
  rawData?: ArrayBuffer;
  slides?: Slide[];
  currentSlide?: number;
  createdAt: Date;
  updatedAt?: Date;
  wordContent?: ContentBlock[];
  wordImages?: ImageItem[];
  excelHeaders?: string[];
  excelData?: ExcelCell[][];
};

export type ParagraphStyle = {
  name: string;
  fontSize: number;
  fontWeight?: any;
  fontStyle?: any;
  textAlign?: any;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
  color: string;
  listType?: 'bullet' | 'numbered' | null;
  listLevel?: number;
  styles?: any
};