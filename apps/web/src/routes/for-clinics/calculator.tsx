import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Calendar, Zap } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for-clinics/calculator")({
  component: CalculatorPage,
});

function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-6">
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-semibold text-charcoal">{label}</label>
        <span className="font-display text-2xl text-coral font-bold">
          {unit === "$" ? `$${value}` : value}
          {unit && unit !== "$" ? unit : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-coral h-2 rounded-full cursor-pointer"
        style={
          {
            background: `linear-gradient(to right, #e8927c ${pct}%, #f5d6ce ${pct}%)`,
          } as React.CSSProperties
        }
      />
      <div className="flex justify-between text-xs text-warm-gray mt-1">
        <span>
          {min}
          {unit && unit !== "$" ? unit : ""}
        </span>
        <span>
          {max}
          {unit && unit !== "$" ? unit : ""}
        </span>
      </div>
    </div>
  );
}

export function CalculatorPage() {
  const [scansPerDay, setScansPerDay] = useState(10);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [pricePerPortrait, setPricePerPortrait] = useState(15);
  const [adoptionRate, setAdoptionRate] = useState(60);

  const paidPortraitsPerDay = scansPerDay * (adoptionRate / 100);
  const weeklyRevenue = paidPortraitsPerDay * daysPerWeek * pricePerPortrait;
  const monthlyRevenue = weeklyRevenue * 4;
  const annualRevenue = weeklyRevenue * 52;
  const equivalentNewScans = (monthlyRevenue / pricePerPortrait).toFixed(0);
  const revenuePerPortrait = pricePerPortrait - 3; // Professional plan $3/portrait

  return (
    <>
      <Helmet>
        <title>Revenue Calculator - BabyPeek for Clinics</title>
        <meta
          name="description"
          content="Calculate how much additional revenue AI baby portraits can add to your ultrasound clinic."
        />
        <link rel="canonical" href="https://babypeek.io/for-clinics/calculator" />
        <meta property="og:title" content="Revenue Calculator - BabyPeek for Clinics" />
        <meta
          property="og:description"
          content="Calculate how much additional revenue AI baby portraits can add to your ultrasound clinic."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/for-clinics/calculator" />
      </Helmet>

      <div className="min-h-screen bg-cream">
        {/* Minimal header */}
        <header className="p-4 sm:p-6 safe-top">
          <div className="sm:max-w-[560px] sm:mx-auto flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
              <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-4 sm:px-6 sm:max-w-[560px] sm:mx-auto pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-warm-gray mb-6">
            <Link to="/" className="hover:text-coral transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/for-clinics" className="hover:text-coral transition-colors">For Clinics</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">Revenue Calculator</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-3">
            Revenue Calculator
          </h1>
          <p className="text-warm-gray text-lg mb-8">
            How much can BabyPeek add to your clinic's revenue?
          </p>

          {/* Revenue output — big & prominent */}
          <div className="rounded-2xl bg-coral text-white p-6 mb-8 shadow-xl">
            <p className="text-white/80 text-sm font-medium mb-1 uppercase tracking-wide">
              Monthly Revenue
            </p>
            <p className="font-display text-5xl font-bold mb-1">
              ${monthlyRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-white/80 text-sm mb-4">
              ${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} per year
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/70 text-xs mb-0.5">Per scan revenue</p>
                <p className="font-display text-xl font-bold">
                  ${(paidPortraitsPerDay * pricePerPortrait).toFixed(0)}/day
                </p>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-0.5">Net per portrait*</p>
                <p className="font-display text-xl font-bold">${revenuePerPortrait}/portrait</p>
              </div>
            </div>
          </div>

          {/* Equivalent scans callout */}
          <div className="rounded-xl bg-coral-light border border-rose p-4 mb-8 flex items-start gap-3">
            <Zap className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="text-charcoal text-sm font-semibold">
                That's like adding{" "}
                <span className="font-display text-coral text-xl">
                  {equivalentNewScans}
                </span>{" "}
                new scans per month
              </p>
              <p className="text-warm-gray text-xs mt-1">
                Pure profit add-on — no extra equipment, no extra staff time beyond 10 seconds of upload.
              </p>
            </div>
          </div>

          {/* Calculator inputs */}
          <div className="rounded-2xl border border-charcoal/10 bg-white/70 p-6 mb-8 shadow-sm">
            <h2 className="font-display text-xl text-charcoal mb-1">
              Adjust Your Numbers
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              Move the sliders to match your clinic's typical week.
            </p>

            <SliderInput
              label="4D Scans Per Day"
              value={scansPerDay}
              min={1}
              max={30}
              onChange={setScansPerDay}
            />
            <SliderInput
              label="Days Per Week Open"
              value={daysPerWeek}
              min={4}
              max={7}
              step={1}
              onChange={setDaysPerWeek}
            />
            <SliderInput
              label="Price Charged to Patient"
              value={pricePerPortrait}
              min={10}
              max={30}
              unit="$"
              onChange={setPricePerPortrait}
            />
            <SliderInput
              label="Patient Adoption Rate"
              value={adoptionRate}
              min={30}
              max={90}
              unit="%"
              onChange={setAdoptionRate}
            />

            {/* Assumptions */}
            <p className="text-xs text-warm-gray mt-2">
              * Assumes Professional plan ($3/portrait to BabyPeek). Based on 4 weeks/month.
            </p>
          </div>

          {/* Revenue breakdown table */}
          <div className="rounded-xl border border-charcoal/10 overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-coral-light">
                  <th className="text-left px-4 py-3 font-semibold text-charcoal">Period</th>
                  <th className="text-right px-4 py-3 font-semibold text-charcoal">Revenue</th>
                  <th className="text-right px-4 py-3 font-semibold text-charcoal">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Per day", revenue: paidPortraitsPerDay * pricePerPortrait, profit: paidPortraitsPerDay * revenuePerPortrait },
                  { label: "Per week", revenue: weeklyRevenue, profit: weeklyRevenue - (paidPortraitsPerDay * daysPerWeek * 3) },
                  { label: "Per month", revenue: monthlyRevenue, profit: monthlyRevenue - (paidPortraitsPerDay * daysPerWeek * 4 * 3) },
                  { label: "Per year", revenue: annualRevenue, profit: annualRevenue - (paidPortraitsPerDay * daysPerWeek * 52 * 3) },
                ].map(({ label, revenue, profit }) => (
                  <tr key={label} className="border-t border-charcoal/10">
                    <td className="px-4 py-3 text-charcoal font-medium">{label}</td>
                    <td className="px-4 py-3 text-right text-charcoal">
                      ${revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-coral">
                      ${profit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <section className="text-center mb-8">
            <h2 className="font-display text-2xl text-charcoal mb-2">
              See What BabyPeek Can Do for Your Clinic
            </h2>
            <p className="text-warm-gray text-sm mb-6">
              Start your free 30-day pilot. 20 complimentary portraits. No contract.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                asChild
                className={cn(
                  "text-lg font-semibold",
                  "bg-coral hover:bg-coral-hover text-white",
                  "shadow-lg hover:shadow-xl",
                  "transition-all duration-200",
                )}
              >
                <Link to="/">Start Your Free Pilot →</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className={cn(
                  "text-lg font-semibold border-charcoal/20",
                  "hover:bg-charcoal/5 text-charcoal",
                  "transition-all duration-200",
                )}
              >
                <a href="mailto:clinics@babypeek.io">
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Schedule a Call
                </a>
              </Button>
            </div>
          </section>

          {/* Internal links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/for-clinics" className="hover:text-coral transition-colors">
              For Clinics Home →
            </Link>
            <Link to="/for-clinics/how-it-works" className="hover:text-coral transition-colors">
              How It Works →
            </Link>
            <Link to="/for-clinics/security" className="hover:text-coral transition-colors">
              Security & Privacy →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
