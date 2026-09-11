export type EventsSearch = { q: string; cidade: string; genero: string; quando: string };

export const eventsSearch = (partial: Partial<EventsSearch> = {}): EventsSearch => ({
  q: "",
  cidade: "",
  genero: "",
  quando: "",
  ...partial,
});
