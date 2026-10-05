import { Experience } from "@/components/Experience";
import { Contact } from "@/components/sections/Contact";
import { Hero } from "@/components/sections/Hero";
import { Pattern } from "@/components/sections/Pattern";
import { Process } from "@/components/sections/Process";
import { Services } from "@/components/sections/Services";
import { Studio } from "@/components/sections/Studio";
import { Work } from "@/components/sections/Work";

export default function Home() {
  return (
    <Experience>
      <main>
        <Hero />
        <Pattern />
        <Studio />
        <Services />
        <Work />
        <Process />
        <Contact />
      </main>
    </Experience>
  );
}
