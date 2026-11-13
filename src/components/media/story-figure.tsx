import Image from "next/image";
import { storyImageFor } from "@/lib/media/story-images";

export function StoryFigure({ title, note }: { title: string; note: string }) {
  const image = storyImageFor(title);
  if (!image) return null;
  return (
    <figure className="story-figure">
      <Image src={image.src} alt={image.alt} width={960} height={540} />
      <figcaption>
        {note} {image.credit}. {image.license}.
      </figcaption>
    </figure>
  );
}
