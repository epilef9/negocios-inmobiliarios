import { request } from './api';

export type ContratoAviso = { id: string; numero: string; propiedad: string; cliente: string; fechaFin: string | null; ajuste: string; dias?: number };
export type RecordatoriosPanel = {
  manana: string;
  visitasManana: { id: string; cliente: string; propiedad: string; hora: string | null; estado: string; avisado: boolean }[];
  porVencer: ContratoAviso[];
  actualizan: ContratoAviso[];
};

export const getRecordatoriosPanel = () => request<RecordatoriosPanel>('/cron/panel');
