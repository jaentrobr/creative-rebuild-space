import electronic from "@/assets/event-electronic.jpg";
import pagode from "@/assets/event-pagode.jpg";
import funk from "@/assets/event-funk.jpg";
import sertanejo from "@/assets/event-sertanejo.jpg";
import { cities } from "@/data/events";

const images: Record<string, string> = {
  "Belo Horizonte": electronic,
  "São Paulo": funk,
  "Rio de Janeiro": pagode,
  "Curitiba": sertanejo,
  "Brasília": electronic,
  "Salvador": pagode,
};

export const cityCards = cities.map((name) => ({ name, image: images[name] ?? electronic }));

const shortNames: Record<string, string> = {
  "Belo Horizonte": "BH",
  "São Paulo": "SP",
  "Rio de Janeiro": "Rio",
  "Curitiba": "Curitiba",
  "Brasília": "Brasília",
  "Salvador": "Salvador",
};

export const cityShort = (name: string) => shortNames[name] ?? name;
