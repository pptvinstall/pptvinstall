import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = {
  "Installation Process": [
    {
      question: "How long does TV mounting typically take?",
      answer: "Most standard TV mounting jobs take 1-2 hours to complete. This includes proper mounting, leveling, and basic cable management. More complex installations with in-wall wiring may take 2-3 hours."
    },
    {
      question: "What wall types can you mount TVs on?",
      answer: "We can mount TVs on drywall, plaster, concrete, and brick walls. Our technicians will ensure proper mounting hardware is used for your specific wall type to guarantee a secure installation."
    },
    {
      question: "Do you provide the mounting bracket?",
      answer: "Yes, our basic and premium installation packages include a standard mounting bracket. If you have a specific bracket or need a specialized mount (like full-motion or ceiling mount), we can accommodate that as well."
    }
  ],
  "Preparation & Requirements": [
    {
      question: "What do I need to have ready before installation?",
      answer: "Please ensure your TV is unpacked, you have all cables you want connected (HDMI, power, etc.), and the mounting area is clear of furniture. Also, having your TV's manual handy can be helpful."
    },
    {
      question: "Can you mount above a fireplace?",
      answer: "Yes, we specialize in above-fireplace mounting. We'll assess the heat exposure and recommend appropriate solutions for both the mount and cable management to ensure safe installation."
    },
    {
      question: "Do I need to be home during installation?",
      answer: "Yes, we require an adult (18+) to be present during the entire installation process to confirm TV placement and ensure satisfaction with the final result."
    }
  ],
  "Services & Pricing": [
    {
      question: "What's included in the basic mounting service?",
      answer: "Basic mounting includes the bracket, professional mounting, basic cable management (outside the wall), and TV leveling. We'll also help you connect your devices and test everything before we leave."
    },
    {
      question: "Do you offer in-wall cable concealment?",
      answer: "Yes, our premium installation package includes in-wall cable concealment. This provides a clean, professional look with no visible wires. We'll install a power bridge system to safely route power and AV cables."
    },
    {
      question: "What is your service area?",
      answer: "We service the greater metropolitan area. Contact us with your location, and we'll confirm if you're within our service range."
    }
  ],
  "After Installation": [
    {
      question: "Do you offer a warranty on installation?",
      answer: "Yes, all our installations come with a 1-year warranty on workmanship. This covers any issues related to the mounting installation itself. Manufacturer warranties cover the hardware we provide."
    },
    {
      question: "What if I need to relocate my mounted TV?",
      answer: "We offer TV relocation services for TVs we've mounted or ones mounted by others. Contact us for a quote on safely moving your TV to a new location."
    },
    {
      question: "Can I adjust the TV after installation?",
      answer: "If you have a tilting or full-motion mount, we'll show you how to safely adjust your TV. For fixed mounts, please contact us for any needed adjustments to ensure safety."
    }
  ]
};

export default function FAQ() {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-600">
              Find answers to common questions about our TV mounting services
            </p>
          </div>

          <div className="space-y-6">
            {Object.entries(faqs).map(([category, questions]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {questions.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
