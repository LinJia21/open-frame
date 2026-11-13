export interface StoryImage {
  src: string;
  alt: string;
  credit: string;
  license: string;
}

const FILES: Record<string, StoryImage> = {
  cannes: { src: "/story-images/cannes.jpg", alt: "Cannes festival hall", credit: "Timantha102938, Wikimedia Commons", license: "Public domain" },
  "cannes-walk": { src: "/story-images/cannes-walk.jpg", alt: "Street beside the Cannes festival hall", credit: "Txllxt TxllxT, Wikimedia Commons", license: "CC BY-SA 4.0" },
  clapper: { src: "/story-images/clapper.jpg", alt: "Film clapperboard", credit: "Mattbr, Wikimedia Commons", license: "CC BY 2.0" },
  filmstrip: { src: "/story-images/filmstrip.jpg", alt: "35mm movie negative", credit: "Runner1616, Wikimedia Commons", license: "CC BY-SA 3.0" },
  studio: { src: "/story-images/studio.jpg", alt: "Television studio lights", credit: "Medea7, Wikimedia Commons", license: "CC BY-SA 4.0" },
  seats: { src: "/story-images/seats.jpg", alt: "Cinema auditorium", credit: "ClemRutter, Wikimedia Commons", license: "CC BY-SA 4.0" },
  seats2: { src: "/story-images/seats2.jpg", alt: "Cinema seats and stage", credit: "ClemRutter, Wikimedia Commons", license: "CC BY-SA 4.0" },
  projector: { src: "/story-images/projector.jpg", alt: "Cinema projector", credit: "Darkking3, Wikimedia Commons", license: "CC BY-SA 3.0" },
  tablet: { src: "/story-images/tablet.jpg", alt: "Drawing on a graphics tablet", credit: "MIKI Yoshihito, Wikimedia Commons", license: "CC BY 2.0" },
  tablet2: { src: "/story-images/tablet2.jpg", alt: "A graphics tablet on a desk", credit: "MIKI Yoshihito, Wikimedia Commons", license: "CC BY 2.0" },
  workstation: { src: "/story-images/workstation.jpg", alt: "Computer workstation", credit: "Berkeley Lab, Wikimedia Commons", license: "Public domain" },
  office: { src: "/story-images/office.jpg", alt: "Office workstation", credit: "Oleg Brovko, Wikimedia Commons", license: "CC BY 2.0" },
  ferry: { src: "/story-images/ferry.jpg", alt: "Harbor at night from a ferry", credit: "Leonhard Lenz, Wikimedia Commons", license: "CC0" },
  "ferry-deck": { src: "/story-images/ferry-deck.jpg", alt: "Ferry deck at night", credit: "Stefan Oemisch, Wikimedia Commons", license: "CC BY-SA 4.0" },
  archive: { src: "/story-images/archive.jpg", alt: "Library shelves", credit: "UCLA Library, Wikimedia Commons", license: "CC0" },
  meeting: { src: "/story-images/meeting.jpg", alt: "A workers' meeting", credit: "Marjory Collins, Wikimedia Commons", license: "Public domain" },
  tv: { src: "/story-images/tv.jpg", alt: "Television studio", credit: "Takajarru, Wikimedia Commons", license: "CC BY-SA 3.0" },
  cel: { src: "/story-images/cel.jpg", alt: "An animation cel", credit: "Goslori, Wikimedia Commons", license: "CC BY-SA 4.0" },
};

const RULES: Array<{ includes: string; file: keyof typeof FILES }> = [
  { includes: "cannes", file: "cannes" },
  { includes: "hollywood fights", file: "clapper" },
  { includes: "state of vfx", file: "studio" },
  { includes: "critterz’ first look", file: "tablet" },
  { includes: "critterz' first look", file: "tablet" },
  { includes: "first look", file: "tablet" },
  { includes: "embraces ai", file: "seats" },
  { includes: "prime video orders", file: "tv" },
  { includes: "three new animated series", file: "tv" },
  { includes: "economic impact", file: "meeting" },
  { includes: "cut animation labor", file: "filmstrip" },
  { includes: "future unscripted", file: "workstation" },
  { includes: "ai and animation", file: "archive" },
  { includes: "cut cost of animated", file: "office" },
  { includes: "cost could drop", file: "office" },
  { includes: "looks for tech partner", file: "projector" },
  { includes: "sora", file: "cel" },
  { includes: "software engineer", file: "workstation" },
  { includes: "employment bulletin", file: "seats2" },
  { includes: "cut episode costs", file: "studio" },
  { includes: "shrinking crews", file: "tablet2" },
  { includes: "gift to small studios", file: "seats2" },
  { includes: "studio history", file: "archive" },
  { includes: "press release", file: "clapper" },
  { includes: "member survey", file: "meeting" },
  { includes: "港口广播", file: "ferry" },
  { includes: "渡轮", file: "ferry" },
  { includes: "ferry", file: "ferry-deck" },
];

export function storyImageFor(title: string): StoryImage | null {
  const normalized = title.toLowerCase().normalize("NFKC");
  const rule = RULES.find((item) => normalized.includes(item.includes));
  return rule ? FILES[rule.file] ?? null : null;
}
