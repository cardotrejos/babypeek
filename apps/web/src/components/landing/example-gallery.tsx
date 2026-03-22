import { cn } from "@/lib/utils";

const examples = [
  {
    id: 1,
    label: "Example 1",
    before: "/images/examples/4d-ultra.jpeg",
    after: "/images/examples/result-1.jpeg",
  },
  {
    id: 2,
    label: "Example 2",
    before: "/images/examples/4d-ultra.jpeg",
    after: "/images/examples/result-2.jpeg",
  },
  {
    id: 3,
    label: "Example 3",
    before: "/images/examples/4d-ultra-2.jpeg",
    after: "/images/examples/result-3.jpeg",
  },
];

interface ExampleGalleryProps {
  className?: string;
}

export function ExampleGallery({ className }: ExampleGalleryProps) {
  return (
    <div
      role="region"
      aria-label="Example transformations gallery"
      className={cn("w-full", className)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
        {examples.map((example, index) => (
          <GalleryCard
            key={example.id}
            before={example.before}
            after={example.after}
            label={example.label}
            loading={index < 2 ? "eager" : "lazy"}
            index={index}
          />
        ))}
      </div>
      <p className="text-center text-xs text-warm-gray/60 mt-6 italic font-light">
        Photos shared with permission from the families.
      </p>
    </div>
  );
}

interface GalleryCardProps {
  before: string;
  after: string;
  label: string;
  loading?: "eager" | "lazy";
  index: number;
}

function GalleryCard({ before, after, label, loading = "lazy", index }: GalleryCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl shadow-sm overflow-hidden",
        "ring-1 ring-charcoal/5",
        "hover:shadow-lg hover:ring-coral/10 transition-all duration-500",
        "animate-fade-up",
        index === 0 && "stagger-1",
        index === 1 && "stagger-2",
        index === 2 && "stagger-3",
      )}
    >
      <div className="grid grid-cols-2">
        {/* Before */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={before}
            alt={`${label}: Original 4D ultrasound`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading={loading}
            width={200}
            height={267}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent" />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur-sm text-charcoal text-[10px] font-medium rounded-full tracking-wide uppercase">
            Before
          </span>
        </div>

        {/* After */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={after}
            alt={`${label}: AI-generated baby portrait`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading={loading}
            width={200}
            height={267}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/10 to-transparent" />
          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-coral/85 backdrop-blur-sm text-white text-[10px] font-medium rounded-full tracking-wide uppercase">
            After
          </span>
        </div>
      </div>
    </div>
  );
}
