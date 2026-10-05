// Every piece of copy on the site lives here. Edit text without touching components.

export const site = {
  name: "Tessarin",
  url: "https://tessarin.studio",
  email: "hello@tessarin.studio",
  // TODO: replace with the real Cal.com booking link.
  bookingUrl: "https://cal.com/tessarin",
  title: "Tessarin — websites, AI products and immersive tech",
  description:
    "Tessarin is a studio for websites, AI products and immersive tech, for brands that refuse to blend in.",
  socials: [
    { label: "LinkedIn", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "X", href: "#" },
  ],
};

export const nav = {
  cta: "Book a call",
  soundOn: "Sound on",
  soundOff: "Sound off",
};

export const preloader = {
  enterWithSound: "Enter with sound",
  enterSilent: "Enter without sound",
  note: "Best with headphones",
};

export const hero = {
  // Lines spelled out by the tile wall. Each line is stretched to full width.
  wall: ["BREAK", "THE", "PATTERN."],
  // Narrow screens have fewer tiles across, so drop the full stop.
  wallPortrait: ["BREAK", "THE", "PATTERN"],
  heading: "Break the pattern.",
  intro:
    "Tessarin is a studio for websites, AI products and immersive tech, for brands that refuse to blend in.",
  hintPointer: "Run your cursor across the wall",
  hintTouch: "Drag across the wall",
  scroll: "Scroll",
};

export const pattern = {
  heading: "You’ve seen this website before.",
  after: "Same template. Same stock handshake. Same promise to be innovative. Visitors leave in three seconds and forget it in ten.",
  punch: "We build the other kind.",
  // Copy for the parody "generic agency" site that gets smashed.
  mock: {
    url: "www.leading-digital-agency.com",
    brand: "AGENCY",
    links: ["Home", "About", "Services", "Portfolio", "Contact"],
    button: "Get a Quote",
    headline: ["We Are A Leading", "Digital Agency"],
    sub: ["Innovative solutions to grow your", "business in the digital world."],
    primary: "Get Started",
    secondary: "Learn More",
    photo: "handshake-stock-photo.jpg",
    cards: ["Web Development", "Mobile Apps", "Digital Marketing"],
    trusted: "Trusted by 100+ clients worldwide",
  },
};

export const studio = {
  heading: ["Young studio.", "Senior habits."],
  body: [
    "We’re a small core team of engineers and designers. We reply the same day, demo every week, and write code the next developer will thank us for.",
    "When a project needs more hands, we bring in hand-picked engineers from FAST, one of Pakistan’s top computer science universities. The team scales with the work, and you never pay for people you don’t need.",
  ],
};

export const services = {
  heading: "What we build",
  items: [
    {
      id: "web",
      name: "Websites & web apps",
      body: "Sites people explore instead of skim, and web apps that hold up when your traffic does. Fast on a mid-range phone, easy for your team to update.",
      list: [
        "Marketing sites and launches",
        "Web apps and dashboards",
        "E-commerce",
        "3D and motion on the web",
        "Headless CMS",
      ],
    },
    {
      id: "ai",
      name: "AI products",
      body: "Assistants that know your business, automations that take busywork off your team, and AI features inside the product you already have. Judged by what they save or earn, not by the demo.",
      list: [
        "Custom assistants and agents",
        "Chat over your own documents",
        "Workflow automation",
        "AI features in existing products",
        "Voice and vision",
      ],
    },
    {
      id: "emerging",
      name: "Emerging tech",
      body: "Real-time 3D, AR that runs in the browser, and installations people queue for. The things your competitors haven’t tried yet.",
      list: [
        "WebGL and real-time 3D",
        "AR in the browser",
        "3D product configurators",
        "Interactive installations",
        "Spatial prototypes",
      ],
    },
  ],
};

// TODO: replace placeholders with real projects. `hue` drives the generated cover.
export const work = {
  heading: "Selected work",
  note: "Full case studies are on their way. Book a call and we’ll walk you through the work live.",
  soon: "Case study soon",
  items: [
    { title: "Project One", kind: "Web app", year: "2026", hue: 8 },
    { title: "Project Two", kind: "AI assistant", year: "2026", hue: 210 },
    { title: "Project Three", kind: "Immersive site", year: "2025", hue: 150 },
    { title: "Project Four", kind: "E-commerce", year: "2025", hue: 40 },
  ],
};

export const process = {
  heading: "How a project runs",
  steps: [
    {
      name: "Talk",
      body: "A 20-minute call. You explain the goal, and we tell you honestly whether we’re the right team.",
    },
    {
      name: "Prototype",
      body: "Within a week you can click something real. Not a slide deck.",
    },
    {
      name: "Build",
      body: "Weekly demos and a shared channel. You always know what shipped and what’s next.",
    },
    {
      name: "Launch and improve",
      body: "We ship, measure what matters, and keep tuning after launch.",
    },
  ],
};

export const contact = {
  heading: ["Got something", "to build?"],
  body: "Tell us what you’re working on. You’ll hear back within a day.",
  cta: "Book a 20-minute call",
  emailPrefix: "Or write to",
  hintPointer: "Throw the tiles around",
  hintTouch: "Flick the tiles around",
  legal: "Built tile by tile.",
};
