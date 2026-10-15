export type CityPageData = {
  slug: string;
  name: string;
  county: string;
  headline: string;
  subheadline: string;
  areaBlurb: string;
  neighborhoods: string[];
  zipCodes: string[];
  faq: Array<{ question: string; answer: string }>;
};

export const cityPages: CityPageData[] = [
  {
    slug: "decatur",
    name: "Decatur",
    county: "DeKalb County",
    headline: "TV Mounting & Smart Home Installation in Decatur, GA",
    subheadline: "Professional evening and weekend service for Decatur homeowners and renters.",
    areaBlurb:
      "We serve all of Decatur and the surrounding DeKalb County communities. Whether you're in a historic bungalow near downtown Decatur Square or a newer build off Ponce de Leon, we'll get your TV on the wall cleanly — wires concealed, mount level, setup complete.",
    neighborhoods: ["Downtown Decatur", "Oakhurst", "Winnona Park", "Fattoria", "Clairemont"],
    zipCodes: ["30030", "30031", "30032", "30033"],
    faq: [
      {
        question: "Do you serve apartments in Decatur?",
        answer:
          "Yes — apartments, condos, and single-family homes alike. We review the wall type, mount compatibility, access, and any building requirements before the install.",
      },
      {
        question: "Can you mount above a fireplace in a Decatur home?",
        answer:
          "Absolutely. Fireplace mounts start at $200. We assess the mantel height, heat exposure, and cable routing before confirming final pricing.",
      },
      {
        question: "How soon can I book in Decatur?",
        answer:
          "Weekend same-day appointments may be available when the calendar has an open slot, with at least 2 hours notice. Weekday evening slots start at 5:30 PM.",
      },
    ],
  },
  {
    slug: "buckhead",
    name: "Buckhead",
    county: "Fulton County",
    headline: "TV Mounting & Smart Home Installation in Buckhead, Atlanta",
    subheadline: "White-glove TV mounting and smart device setup for Buckhead residences.",
    areaBlurb:
      "Buckhead's high-rise condos, luxury townhomes, and classic estates get the same careful, clean-looking installation approach we use across Atlanta. We review wall type, access, TV size, and mount compatibility before the job.",
    neighborhoods: ["Buckhead Village", "Garden Hills", "Tuxedo Park", "Peachtree Hills", "Paces Ferry"],
    zipCodes: ["30305", "30327", "30342"],
    faq: [
      {
        question: "Do you install in Buckhead high-rises?",
        answer:
          "Yes. We're comfortable with concrete and drywall over metal stud construction common in Buckhead condos. We use appropriate anchors for each wall type.",
      },
      {
        question: "Can you conceal cables in my Buckhead townhome?",
        answer:
          "Our standard clean-cord solution is a $100 outlet-behind-TV add-on. Fireplace paths, unusual wall conditions, or more complex electrical scope require review before final pricing.",
      },
      {
        question: "Do you install security cameras in Buckhead?",
        answer:
          "We selectively install smart cameras after reviewing the exact device, wiring, location, access, and scope. Camera work is custom-quoted rather than priced automatically.",
      },
    ],
  },
  {
    slug: "marietta",
    name: "Marietta",
    county: "Cobb County",
    headline: "TV Mounting & Smart Home Installation in Marietta, GA",
    subheadline: "Reliable evening and weekend TV installs across Marietta and Cobb County.",
    areaBlurb:
      "From the East Cobb suburbs to historic neighborhoods near Marietta Square, we cover all of Marietta. Weekend and weekday evening appointments available — we work around your schedule so installation doesn't require taking time off.",
    neighborhoods: ["East Cobb", "West Marietta", "Kennesaw Mountain", "Marietta Square", "Lost Mountain"],
    zipCodes: ["30060", "30062", "30064", "30066", "30067", "30068"],
    faq: [
      {
        question: "How far is Marietta from your home base?",
        answer:
          "We serve Marietta and review distance, access, route fit, schedule, and the total job before confirming the appointment. We do not add an automatic mileage fee from ZIP alone.",
      },
      {
        question: "Can you mount a TV above a brick fireplace in Marietta?",
        answer:
          "Yes. Brick and stone wall mounting is a specialty. We use masonry anchors and confirm cable routing options before finalizing pricing.",
      },
      {
        question: "Do you offer same-day appointments in Marietta?",
        answer:
          "Same-day weekend appointments may be possible when an open slot remains, with at least 2 hours notice. Weekday evening slots start at 5:30 PM.",
      },
    ],
  },
  {
    slug: "alpharetta",
    name: "Alpharetta",
    county: "Fulton County",
    headline: "TV Mounting & Smart Home Installation in Alpharetta, GA",
    subheadline: "Professional TV mounting for Alpharetta homes — evenings and weekends.",
    areaBlurb:
      "Alpharetta's newer subdivisions and tech-corridor townhomes are a strong fit for TV mounting and outlet-behind-TV work. Select smart-home and soundbar requests are reviewed individually and custom-quoted.",
    neighborhoods: ["Downtown Alpharetta", "Avalon", "Windward", "Milton", "Providence"],
    zipCodes: ["30004", "30005", "30009", "30022"],
    faq: [
      {
        question: "Can you do a multi-room TV install in Alpharetta in one visit?",
        answer:
          "Yes — multi-TV installs are a core service. Use our quote tool to configure each room; any discount or bundle adjustment is handled case-by-case.",
      },
      {
        question: "Is there a travel fee for Alpharetta?",
        answer:
          "Alpharetta is within our broader working area. Distance and route fit are reviewed case-by-case; we do not apply an automatic ZIP-based travel fee.",
      },
      {
        question: "Do you install Nest or Ring doorbells in Alpharetta?",
        answer:
          "Smart doorbell work is available selectively after we review the exact device, existing wiring, and requested setup. Pricing is custom-quoted.",
      },
    ],
  },
  {
    slug: "midtown-atlanta",
    name: "Midtown Atlanta",
    county: "Fulton County",
    headline: "TV Mounting & Smart Home Installation in Midtown Atlanta",
    subheadline: "Expert TV and smart home installs for Midtown condos and lofts.",
    areaBlurb:
      "Midtown's mix of historic bungalows, converted lofts, and modern high-rises requires experience with all wall types. We work in open-plan spaces, concrete ceilings, and brick industrial walls — no fuss, just a clean install.",
    neighborhoods: ["Arts Center", "Ansley Park", "Virginia-Highland", "Ponce City Market area", "Tech Square"],
    zipCodes: ["30308", "30309", "30363"],
    faq: [
      {
        question: "Can you mount a TV on a brick loft wall in Midtown?",
        answer:
          "Yes. Standard mounting starts at $100, with a $50 brick/stone surface add-on when the job remains within normal scope. We confirm wall conditions and feasibility before booking.",
      },
      {
        question: "Do you work in Midtown high-rise condos?",
        answer:
          "Yes — we're familiar with Midtown condo construction types. We review the wall type, building requirements, and required hardware before the install.",
      },
      {
        question: "How do I book a TV mount in Midtown Atlanta?",
        answer:
          "Use our online booking tool to pick a time and lock in your slot. Evening and weekend availability — no parking hassle, we find our way.",
      },
    ],
  },
  {
    slug: "roswell",
    name: "Roswell",
    county: "Fulton County",
    headline: "TV Mounting & Smart Home Installation in Roswell, GA",
    subheadline: "Trusted TV installation for Roswell families — evenings and weekends.",
    areaBlurb:
      "Roswell's established neighborhoods and newer subdivisions are a regular stop for us. TV mounting is a core service; selective camera and smart-home requests are reviewed individually before we confirm scope and pricing.",
    neighborhoods: ["Historic Roswell", "East Roswell", "Crabapple", "Mountain Park", "Chattahoochee Plantation"],
    zipCodes: ["30075", "30076"],
    faq: [
      {
        question: "Do you install security cameras in Roswell?",
        answer:
          "We selectively install camera systems after reviewing the exact device, wiring, location, access, and scope. Camera work is custom-quoted.",
      },
      {
        question: "Can you handle a multi-TV install in a Roswell home?",
        answer:
          "Absolutely. We configure each TV individually — different wall types, mount styles, and rooms. Any multi-TV discount is handled case-by-case.",
      },
      {
        question: "What's your availability in Roswell?",
        answer:
          "Weekday appointments run from 5:30 PM to 7:00 PM. Weekend appointments run from 11:00 AM to 7:00 PM.",
      },
    ],
  },
  {
    slug: "lawrenceville",
    name: "Lawrenceville",
    county: "Gwinnett County",
    headline: "TV Mounting & Smart Home Installation in Lawrenceville, GA",
    subheadline: "Professional TV and smart home installs across Lawrenceville and Gwinnett County.",
    areaBlurb:
      "Lawrenceville and the surrounding Gwinnett communities are part of our broader working area. New construction or older home — we review the wall, access, distance, route fit, and total job before confirming the appointment.",
    neighborhoods: ["Historic Lawrenceville", "Sugarloaf", "Hamilton Mill", "Collins Hill", "Snellville"],
    zipCodes: ["30043", "30044", "30045", "30046"],
    faq: [
      {
        question: "Is there a travel fee for Lawrenceville?",
        answer:
          "We do not apply an automatic ZIP-based travel fee. Distance, access, route fit, schedule, and the total job are reviewed case-by-case before final booking.",
      },
      {
        question: "Do you work in new construction homes in Gwinnett County?",
        answer:
          "Yes. New builds are actually ideal — clean drywall, easy stud access, pre-wired spaces. We're experienced with builder-grade and custom homes.",
      },
      {
        question: "Can you mount a TV and set up a security camera in one visit?",
        answer:
          "Potentially. TV mounting and the $100 outlet-behind-TV option are standard services; smart-home devices are reviewed individually so we can confirm capability, scope, and price first.",
      },
    ],
  },
  {
    slug: "sandy-springs",
    name: "Sandy Springs",
    county: "Fulton County",
    headline: "TV Mounting & Smart Home Installation in Sandy Springs, GA",
    subheadline: "Evening and weekend TV installs for Sandy Springs homes and apartments.",
    areaBlurb:
      "Sandy Springs — from Perimeter Center to the Dunwoody border — is within our Atlanta-area working footprint. Evening and weekend appointments are available; route fit is confirmed case-by-case.",
    neighborhoods: ["Perimeter Center", "Hammond Park", "Dunwoody-adjacent", "Northridge", "Johnson Ferry"],
    zipCodes: ["30328", "30338", "30350"],
    faq: [
      {
        question: "Is Sandy Springs in your free travel zone?",
        answer:
          "We serve Sandy Springs and do not apply an automatic mileage fee from ZIP alone. Route fit, access, schedule, and the total job are reviewed before final booking.",
      },
      {
        question: "Do you do TV installs in Sandy Springs apartments?",
        answer:
          "Yes. We're familiar with apartment and condo work near Perimeter. We review the wall type, mount compatibility, building requirements, and access before installation.",
      },
      {
        question: "How do I book in Sandy Springs?",
        answer:
          "Book online 24/7 — pick your date and time, we hold the slot. You can also call 404-702-4748 for immediate scheduling.",
      },
    ],
  },
];

export function getCityBySlug(slug: string): CityPageData | undefined {
  return cityPages.find((city) => city.slug === slug);
}
