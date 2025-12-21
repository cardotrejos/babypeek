import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FaqSectionProps {
  id?: string
  className?: string
}

/**
 * FaqSection Component
 * Displays expandable FAQ items with accordion behavior.
 *
 * Features:
 * - Single item open at a time (type="single")
 * - Keyboard accessible (Tab, Enter/Space)
 * - Screen reader compatible (aria-expanded)
 * - Warm, conversational copy tone
 * - Responsive layout
 *
 * @see Story 2.5 - FAQ Accordion
 */

const faqItems = [
  {
    question: "How does BabyPeek work?",
    answer:
      "Simply upload your 4D ultrasound image, and our AI transforms it into a beautiful, photorealistic portrait of your baby in about 60 seconds. You'll see a stunning reveal, then you can share it with family or purchase the HD version.",
  },
  {
    question: "How much does it cost?",
    answer:
      "You can preview your baby's portrait for free! The HD download is $9.99 - a small price for such a special keepsake. We also offer gift options so grandparents and family can purchase it for you.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Absolutely. Your privacy matters to us. All images are transmitted securely via HTTPS, are never shared with anyone, and are automatically deleted after 30 days. You can also delete your data anytime.",
  },
  {
    question: "What makes the images so realistic?",
    answer:
      "We use advanced AI technology specifically trained to understand baby features from ultrasound images. Each result goes through quality checks to ensure you get the best possible portrait.",
  },
]

export function FaqSection({ id, className }: FaqSectionProps) {
  return (
    <section id={id} className={cn("py-12", className)}>
      <h2 className="font-display text-2xl text-charcoal text-center mb-8">
        Questions? We've got answers
      </h2>

      <Accordion className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem key={index} value={index}>
            <AccordionTrigger
              className={cn(
                "text-left text-base font-semibold text-charcoal",
                "hover:text-coral hover:no-underline",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
                "min-h-[48px] py-4"
              )}
            >
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-warm-gray text-sm leading-relaxed pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
