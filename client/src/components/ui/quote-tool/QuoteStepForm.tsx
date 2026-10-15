import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mic,
  Minus,
  Plus,
  ShieldAlert,
} from "lucide-react";

import { formatPrice, pricingData } from "@/data/pricing-data";
import {
  type CameraConfig,
  type CameraType,
  type MountType,
  type WallType,
} from "@/lib/quote-calculator";
import { getAreaName } from "@/lib/travel-pricing";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DESCRIBE_IT_MAX_CHARS,
  getMountPriceLabel,
  mountTypeLabels,
  tvAccentClasses,
  tvDotClass,
  updateCameraCount,
  updateTvCount,
  wallTypeLabels,
  extractZipFromDescription,
  isValidFiveDigitZip,
} from "@/components/ui/quote-tool/shared";
import { SelectorButton, ToggleCard } from "@/components/ui/quote-tool/QuoteComponents";
import { useQuoteContext } from "@/components/ui/quote-tool/useQuoteState";

export default function QuoteStepForm() {
  const {
    mode,
    setMode,
    formState,
    setFormState,
    tvCountLabel,
    setTvCountLabel,
    activeTvId,
    setActiveTvId,
    standaloneServices,
    setStandaloneServices,
    zipError,
    setZipError,
    textInput,
    setTextInput,
    textZipCode,
    setTextZipCode,
    textZipError,
    setTextZipError,
    textZipTouched,
    setTextZipTouched,
    textZipAutoDetected,
    setTextZipAutoDetected,
    textTravelContext,
    travelContext,
    honeypotValue,
    setHoneypotValue,
    isRecording,
    browserSupportsSpeechRecognition,
    microphonePermission,
    voiceError,
    voiceTranscript,
    turnstileRequired,
    turnstileError,
    turnstileContainerRef,
    aiQuoteConfigLoaded,
    aiQuoteEnabled,
    liveQuote,
    isZipValid,
    describeUsageRatio,
    describeCharacterCount,
    cleanedTextInput,
    handleFormQuote,
    handleDescribeItQuote,
    handleNarrativeQuote,
    toggleRecording,
    step,
  } = useQuoteContext();

  // Extras start closed so phones see the TV questions and the ZIP box first.
  // They open automatically if anything in them is already selected.
  const extrasSelected =
    formState.cameras.length > 0 ||
    formState.doorbell ||
    formState.soundbar ||
    formState.surroundSound ||
    formState.floodlight ||
    formState.handymanMinutes > 0 ||
    standaloneServices.sharedUnmountCount > 0;
  const [extrasOpen, setExtrasOpen] = useState(extrasSelected);

  const submitFormQuote = () => {
    if (!isZipValid) {
      setZipError("Add your 5-digit ZIP code to see your price.");
      const zipInput = document.getElementById("quote-zip");
      if (zipInput) {
        zipInput.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => zipInput.focus({ preventScroll: true }), 350);
      }
      return;
    }
    void handleFormQuote();
  };

  return (
    <AnimatePresence mode="wait">
      {step === "build" ? (
        <motion.div
          key="build"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-6 p-5 md:p-8"
        >
          <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)} className="w-full">
            <TabsList data-quote-tabs="true" className="grid h-auto w-full grid-cols-3 gap-2 rounded-3xl bg-slate-100 p-2">
              <TabsTrigger value="form" className="rounded-2xl px-4 py-3 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Build It
              </TabsTrigger>
              <TabsTrigger value="text" className="rounded-2xl px-4 py-3 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Describe It
              </TabsTrigger>
              <TabsTrigger value="voice" className="rounded-2xl px-4 py-3 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Voice Note
              </TabsTrigger>
            </TabsList>
            <p className="mt-3 text-center text-xs text-slate-500">
              {mode === "form"
                ? "Tap through your setup. Best if you know what you need."
                : mode === "text"
                  ? "Type it in your own words and we'll figure out the details."
                  : "Easier to say it out loud? Record a quick voice note."}
            </p>

            {/* ── Build It (form) ─────────────────────────────────────────── */}
            <TabsContent value="form" className="mt-6 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">1. How many TVs?</h4>
                    <p className="text-sm text-slate-500">Pick 0 if you only need cameras, a doorbell, or other services.</p>
                  </div>
                  {formState.tvs.length >= 5 ? (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-800">Large project</Badge>
                  ) : null}
                </div>
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {["0", "1", "2", "3", "4", "5+"].map((option) => (
                    <SelectorButton
                      key={option}
                      selected={tvCountLabel === option}
                      onClick={() => {
                        const nextCount = option === "5+" ? 5 : Number(option);
                        const nextTvs = updateTvCount(formState.tvs, nextCount);
                        setTvCountLabel(option);
                        setFormState((current) => ({ ...current, tvs: nextTvs }));
                        setActiveTvId(nextTvs[0]?.id ?? "");
                      }}
                      className="px-0 py-3.5 text-base sm:py-4"
                    >
                      {option}
                    </SelectorButton>
                  ))}
                </div>
                {formState.tvs.length >= 5 ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Large multi-room project</AlertTitle>
                    <AlertDescription>
                      Large multi-room projects may qualify for a custom bundle rate. We&apos;ll discuss that at booking.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </section>

              {formState.tvs.length > 0 ? (
                <section className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{formState.tvs.length > 1 ? "2. Set up each TV" : "2. Set up your TV"}</h4>
                    <p className="text-sm text-slate-500">{formState.tvs.length > 1 ? "Tap each TV to set its wall, mount, and wires." : "Wall, mount, and wires for your TV."}</p>
                  </div>

                  <Tabs value={activeTvId} onValueChange={setActiveTvId} className="w-full">
                    <TabsList className={cn("h-auto w-full grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-2 md:grid-cols-5", formState.tvs.length > 1 ? "grid" : "hidden")}>
                      {formState.tvs.map((tv, index) => (
                        <TabsTrigger
                          key={tv.id}
                          value={tv.id}
                          className="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold data-[state=active]:bg-white"
                        >
                          <span className={cn("h-2.5 w-2.5 rounded-full", tvDotClass(index))} />
                          {`TV ${index + 1}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {formState.tvs.map((tv, index) => (
                      <TabsContent key={tv.id} value={tv.id} className={formState.tvs.length > 1 ? "mt-4" : "mt-0"}>
                        <div className={cn("rounded-[28px] border border-slate-200 border-l-4 bg-slate-50 p-5 md:p-6", tvAccentClasses[index] ?? "border-l-blue-500")}>
                          <div className="space-y-6">
                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">TV Size</p>
                              <div className="grid grid-cols-2 gap-3">
                                <SelectorButton
                                  selected={tv.size === "32-55"}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, size: "32-55" } : item)) }))}
                                >
                                  32"-55"
                                </SelectorButton>
                                <SelectorButton
                                  selected={tv.size === "56+"}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, size: "56+" } : item)) }))}
                                >
                                  56"+
                                </SelectorButton>
                              </div>
                            </section>

                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Where is this TV going?</p>
                              <div className="grid grid-cols-2 gap-3">
                                <SelectorButton
                                  selected={tv.location === "standard"}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, location: "standard" } : item)) }))}
                                >
                                  Standard wall
                                </SelectorButton>
                                <SelectorButton
                                  selected={tv.location === "fireplace"}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, location: "fireplace", outletDistance: null } : item)) }))}
                                >
                                  Above fireplace
                                </SelectorButton>
                              </div>
                              {tv.location === "fireplace" ? (
                                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>Fireplace setup note</AlertTitle>
                                  <AlertDescription>
                                    Fireplace mounts start at {formatPrice(pricingData.tvMounting.fireplace.price)}. Wire concealment above fireplaces requires a photo assessment - we&apos;ll confirm pricing after booking.
                                  </AlertDescription>
                                </Alert>
                              ) : null}
                            </section>

                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Wall type</p>
                              <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {(["drywall", "brick", "highrise"] as WallType[]).map((wallType) => (
                                  <SelectorButton
                                    key={wallType}
                                    selected={tv.wallType === wallType}
                                    onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, wallType } : item)) }))}
                                    className="px-2 text-xs leading-snug sm:px-4 sm:text-sm"
                                  >
                                    {wallTypeLabels[wallType]}
                                  </SelectorButton>
                                ))}
                              </div>
                            </section>

                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Do you have a mount?</p>
                              <div className="grid grid-cols-2 gap-3">
                                <SelectorButton
                                  selected={tv.hasMount}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, hasMount: true, mountType: null } : item)) }))}
                                >
                                  I have a mount
                                </SelectorButton>
                                <SelectorButton
                                  selected={!tv.hasMount}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => item.id === tv.id ? { ...item, hasMount: false, mountType: item.mountType ?? "fixed" } : item) }))}
                                >
                                  I need a mount
                                </SelectorButton>
                              </div>
                              {!tv.hasMount ? (
                                <div className="grid grid-cols-3 gap-2 md:gap-3">
                                  {(["fixed", "tilting", "fullMotion"] as MountType[]).map((mountType) => (
                                    <SelectorButton
                                      key={mountType}
                                      selected={tv.mountType === mountType}
                                      onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, mountType } : item)) }))}
                                      className="min-h-[84px] px-2.5 text-left sm:px-4"
                                    >
                                      <div>{mountTypeLabels[mountType]}</div>
                                      <div className="mt-1 text-xs font-medium opacity-80">
                                        {mountType === "fixed" ? "Most affordable, doesn't move" : mountType === "tilting" ? "Angle up/down" : "Swings out and rotates"}
                                      </div>
                                      <div className="mt-2 text-sm font-bold">{getMountPriceLabel(tv.size, mountType)}</div>
                                    </SelectorButton>
                                  ))}
                                </div>
                              ) : null}
                            </section>

                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Wire concealment for this TV?</p>
                              {tv.location === "fireplace" ? (
                                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>Assessment required</AlertTitle>
                                  <AlertDescription>
                                    Wire concealment above fireplace requires assessment. We&apos;ll quote after photos.
                                  </AlertDescription>
                                </Alert>
                              ) : null}
                              <div className="grid grid-cols-2 gap-3">
                                <SelectorButton
                                  selected={!tv.wireConcealment}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, wireConcealment: false, outletDistance: null } : item)) }))}
                                >
                                  No thanks
                                </SelectorButton>
                                <SelectorButton
                                  selected={tv.wireConcealment}
                                  onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, wireConcealment: true } : item)) }))}
                                >
                                  Yes - hide my wires (+{formatPrice(pricingData.wireConcealment.standard.price)})
                                </SelectorButton>
                              </div>
                              {tv.wireConcealment && tv.location !== "fireplace" ? (
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">Is the existing outlet within 1-2 feet of where you want the TV mounted?</p>
                                    <p className="mt-1 text-sm text-slate-500">This helps us confirm whether the standard concealment price is the right fit.</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <SelectorButton
                                      selected={tv.outletDistance === "near"}
                                      onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, outletDistance: "near" } : item)) }))}
                                    >
                                      Yes, it&apos;s close
                                    </SelectorButton>
                                    <SelectorButton
                                      selected={tv.outletDistance === "far"}
                                      onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, outletDistance: "far" } : item)) }))}
                                    >
                                      No, it&apos;s farther away
                                    </SelectorButton>
                                  </div>
                                  {tv.outletDistance === "near" ? (
                                    <p className="text-sm text-green-700">Perfect. We&apos;ll treat this as a standard concealment setup for the estimate.</p>
                                  ) : tv.outletDistance === "far" ? (
                                    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertTitle>Extra outlet work may be needed</AlertTitle>
                                      <AlertDescription>
                                        If the outlet is farther than 1-2 feet from the TV location, we may need to confirm extra work before final pricing.
                                      </AlertDescription>
                                    </Alert>
                                  ) : (
                                    <p className="text-sm text-slate-500">If you&apos;re not sure yet, we&apos;ll assume a nearby outlet for this estimate and confirm anything unusual before booking.</p>
                                  )}
                                </div>
                              ) : null}
                            </section>

                            <section className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Anything else for this TV?</p>
                              <SelectorButton
                                selected={tv.unmounting}
                                onClick={() => setFormState((current) => ({ ...current, tvs: current.tvs.map((item) => (item.id === tv.id ? { ...item, unmounting: !item.unmounting } : item)) }))}
                                className="w-full text-left"
                              >
                                Remove/unmount existing TV first (+{formatPrice(pricingData.tvMounting.unmount.price)})
                              </SelectorButton>
                            </section>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </section>
              ) : (
                <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">2. Standalone services</h4>
                    <p className="text-sm text-slate-500">No TV mounting? No problem. Add your services below.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h5 className="text-sm font-bold text-slate-900">{pricingData.otherServices.tvUnmounting.name}</h5>
                      <p className="mt-1 text-sm text-slate-500">{pricingData.otherServices.tvUnmounting.description}</p>
                      <p className="mt-2 text-sm font-semibold text-blue-600">{formatPrice(pricingData.otherServices.tvUnmounting.price)} each</p>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {[0, 1, 2, 3, 4].map((count) => (
                          <SelectorButton key={count} selected={standaloneServices.removalCount === count} onClick={() => setStandaloneServices((current) => ({ ...current, removalCount: count }))}>
                            {count}
                          </SelectorButton>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h5 className="text-sm font-bold text-slate-900">{pricingData.otherServices.avTroubleshooting.name}</h5>
                      <p className="mt-1 text-sm text-slate-500">{pricingData.otherServices.avTroubleshooting.description}</p>
                      <p className="mt-2 text-sm font-semibold text-blue-600">Custom quote after scope review</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { minutes: 60, label: "Up to 1 hr" },
                          { minutes: 90, label: "About 1.5 hr" },
                          { minutes: 120, label: "About 2 hr" },
                          { minutes: 150, label: "2+ hr / unsure" },
                        ].map((option) => (
                          <SelectorButton key={option.minutes} selected={standaloneServices.troubleshootingMinutes === option.minutes} onClick={() => setStandaloneServices((current) => ({ ...current, troubleshootingMinutes: option.minutes }))}>
                            {option.label}
                          </SelectorButton>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-slate-500">Time is only for scope planning; final pricing is confirmed after review.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h5 className="text-sm font-bold text-slate-900">{pricingData.otherServices.wireManagementOnly.name}</h5>
                      <p className="mt-1 text-sm text-slate-500">{pricingData.otherServices.wireManagementOnly.description}</p>
                      <p className="mt-2 text-sm font-semibold text-blue-600">Custom quote · outlet-behind-TV is our standard clean-cord option</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[0, 1, 2, 3].map((count) => (
                          <SelectorButton key={count} selected={standaloneServices.wireManagementLocations === count} onClick={() => setStandaloneServices((current) => ({ ...current, wireManagementLocations: count }))}>
                            {count === 0 ? "No thanks" : `${count} ${count === 1 ? "location" : "locations"}`}
                          </SelectorButton>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h5 className="text-sm font-bold text-slate-900">{pricingData.otherServices.deviceSetup.name}</h5>
                      <p className="mt-1 text-sm text-slate-500">{pricingData.otherServices.deviceSetup.description}</p>
                      <p className="mt-2 text-sm font-semibold text-blue-600">Custom quote after device review</p>
                      <div className="mt-3">
                        <ToggleCard
                          title="Add device setup service"
                          active={standaloneServices.deviceSetup}
                          onClick={() => setStandaloneServices((current) => ({ ...current, deviceSetup: !current.deviceSetup }))}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">3. Moving?</h4>
                  <p className="text-sm text-slate-500">Only if we&apos;re also taking things down at your old place.</p>
                </div>
                <ToggleCard
                  title="Yes, include work at my previous home"
                  active={formState.moveProject.enabled}
                  onClick={() => setFormState((current) => ({ ...current, moveProject: { ...current.moveProject, enabled: !current.moveProject.enabled } }))}
                />
                {formState.moveProject.enabled ? (
                  <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">Previous-home ZIP (optional for estimate)</label>
                      <Input
                        value={formState.moveProject.previousZipCode}
                        maxLength={5}
                        inputMode="numeric"
                        placeholder="Old ZIP (optional)"
                        className="h-12 rounded-xl bg-white"
                        onChange={(event) => {
                          const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 5);
                          setFormState((current) => ({ ...current, moveProject: { ...current.moveProject, previousZipCode: digitsOnly } }));
                        }}
                      />
                      {formState.moveProject.previousZipCode && !/^\d{5}$/.test(formState.moveProject.previousZipCode) ? <p className="text-xs text-amber-700">Enter 5 digits, or leave it blank and we&apos;ll confirm the route later.</p> : null}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">TVs to take down at the previous home</p>
                      <p className="mt-1 text-xs text-slate-500">{formatPrice(pricingData.tvMounting.unmount.price)} each.</p>
                      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                        {[0, 1, 2, 3, 4, 5, 6].map((count) => (
                          <SelectorButton key={count} selected={formState.moveProject.oldHomeTvUnmountCount === count} onClick={() => setFormState((current) => ({ ...current, moveProject: { ...current.moveProject, oldHomeTvUnmountCount: count } }))}>{count}</SelectorButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">TV already down — remove mount / wall hardware only</p>
                      <p className="mt-1 text-xs text-slate-500">{formatPrice(pricingData.moveProject.mountRemovalOnly.price)} each.</p>
                      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                        {[0, 1, 2, 3, 4, 5, 6].map((count) => (
                          <SelectorButton key={count} selected={formState.moveProject.oldHomeMountRemovalCount === count} onClick={() => setFormState((current) => ({ ...current, moveProject: { ...current.moveProject, oldHomeMountRemovalCount: count } }))}>{count}</SelectorButton>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">Wire-rack / shelving teardown</p>
                      <p className="mt-1 text-xs text-slate-500">Pick the closest labor band; we can tighten it after photos.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {([
                          { value: "none", label: "None", detail: "No rack teardown" },
                          { value: "small", label: "Light", detail: "~1 hr · $150" },
                          { value: "medium", label: "Medium", detail: "~2 hr · $250" },
                          { value: "large", label: "Large", detail: "~3 hr · $350" },
                        ] as const).map((option) => (
                          <SelectorButton key={option.value} selected={formState.moveProject.rackTeardownLevel === option.value} onClick={() => setFormState((current) => ({ ...current, moveProject: { ...current.moveProject, rackTeardownLevel: option.value } }))} className="min-h-[72px] text-left">
                            <div>{option.label}</div><div className="mt-1 text-xs font-medium opacity-70">{option.detail}</div>
                          </SelectorButton>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      Two-location coordination is {formatPrice(pricingData.moveProject.secondSiteCoordination.price)}. Move projects with at least {pricingData.moveProject.bundleDiscount.minimumNewTvInstalls} new TV installs automatically show {formatPrice(pricingData.moveProject.bundleDiscount.amount)} in bundle savings.
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white">
                <button
                  type="button"
                  aria-expanded={extrasOpen}
                  onClick={() => setExtrasOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6"
                >
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">4. Extras <span className="text-base font-medium text-slate-400">(optional)</span></h4>
                    <p className="text-sm text-slate-500">Cameras, doorbell, soundbar, floodlight, removals, special requests.</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {extrasSelected ? <Badge className="border-blue-200 bg-blue-50 text-blue-700">Added</Badge> : null}
                    <ChevronDown className={cn("h-5 w-5 text-slate-500 transition-transform", extrasOpen && "rotate-180")} />
                  </span>
                </button>

                {extrasOpen ? (
                <div className="space-y-5 border-t border-slate-100 p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Security cameras</p>
                    <p className="text-xs text-slate-500">Custom-priced after a quick device review.</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      aria-label="Remove a camera"
                      disabled={formState.cameras.length === 0}
                      onClick={() => setFormState((current) => ({ ...current, cameras: updateCameraCount(current.cameras, Math.max(0, current.cameras.length - 1)) }))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-base font-bold tabular-nums text-slate-900" aria-live="polite">{formState.cameras.length}</span>
                    <button
                      type="button"
                      aria-label="Add a camera"
                      disabled={formState.cameras.length >= 8}
                      onClick={() => setFormState((current) => ({ ...current, cameras: updateCameraCount(current.cameras, Math.min(8, current.cameras.length + 1)) }))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {formState.cameras.length > 0 ? (
                    <div className="space-y-3">
                      {formState.cameras.map((camera, index) => (
                        <div key={camera.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                          <select
                            aria-label={`Camera ${index + 1} brand`}
                            title={`Camera ${index + 1} brand`}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            value={camera.brand}
                            onChange={(event) => setFormState((current) => ({ ...current, cameras: current.cameras.map((item) => item.id === camera.id ? { ...item, brand: event.target.value as CameraConfig["brand"] } : item) }))}
                          >
                            <option value="ring">Ring</option>
                            <option value="blink">Blink</option>
                            <option value="google">Google Nest</option>
                            <option value="arlo">Arlo</option>
                            <option value="wyze">Wyze</option>
                            <option value="other">Other</option>
                          </select>
                          <select
                            aria-label={`Camera ${index + 1} connection type`}
                            title={`Camera ${index + 1} connection type`}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            value={camera.type}
                            onChange={(event) => setFormState((current) => ({ ...current, cameras: current.cameras.map((item) => item.id === camera.id ? { ...item, type: event.target.value as CameraType } : item) }))}
                          >
                            <option value="wireless_smart">Wireless smart</option>
                            <option value="wired_smart">Wired smart</option>
                            <option value="wired_dvr">Wired DVR/NVR</option>
                          </select>
                          <select
                            aria-label={`Camera ${index + 1} location`}
                            title={`Camera ${index + 1} location`}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            value={camera.location}
                            onChange={(event) => setFormState((current) => ({ ...current, cameras: current.cameras.map((item) => item.id === camera.id ? { ...item, location: event.target.value as CameraConfig["location"] } : item) }))}
                          >
                            <option value="indoor">Indoor</option>
                            <option value="outdoor">Outdoor</option>
                          </select>
                          <p className="md:col-span-3 text-xs font-semibold text-slate-500">
                            Camera {index + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <ToggleCard
                    title="Add smart doorbell install (custom quote)"
                    active={formState.doorbell}
                    onClick={() => setFormState((current) => ({ ...current, doorbell: !current.doorbell }))}
                  />
                  <ToggleCard
                    title="Add soundbar setup (custom quote)"
                    active={formState.soundbar}
                    onClick={() => setFormState((current) => ({ ...current, soundbar: !current.soundbar }))}
                  />
                  <ToggleCard
                    title="Surround-sound request (scope review)"
                    active={formState.surroundSound}
                    onClick={() => setFormState((current) => ({ ...current, surroundSound: !current.surroundSound }))}
                  />
                  <ToggleCard
                    title="Add smart floodlight (custom quote)"
                    active={formState.floodlight}
                    onClick={() => setFormState((current) => ({ ...current, floodlight: !current.floodlight }))}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Unmount existing TV(s) before new install</p>
                  <p className="mt-1 text-sm text-slate-500">{formatPrice(pricingData.tvMounting.unmount.price)} each. Use this for extra removals at the current job site; use the move section above for a previous home.</p>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map((count) => (
                      <SelectorButton key={count} selected={standaloneServices.sharedUnmountCount === count} onClick={() => setStandaloneServices((current) => ({ ...current, sharedUnmountCount: count }))}>
                        {count}
                      </SelectorButton>
                    ))}
                  </div>
                </div>

                {formState.doorbell ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Doorbell brand</p>
                    <select
                      aria-label="Doorbell brand"
                      title="Doorbell brand"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      value={formState.doorbellBrand}
                      onChange={(event) => setFormState((current) => ({ ...current, doorbellBrand: event.target.value }))}
                    >
                      <option value="Ring">Ring</option>
                      <option value="Nest">Nest</option>
                      <option value="Arlo">Arlo</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                ) : null}

                {formState.floodlight ? (
                  <p className="text-xs text-slate-500">Requires existing outdoor wiring. No-wiring installs need assessment.</p>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <ToggleCard
                    title="I have a specialty AV / mounting request"
                    active={formState.handymanMinutes > 0}
                    onClick={() => setFormState((current) => ({ ...current, handymanMinutes: current.handymanMinutes > 0 ? 0 : 60 }))}
                  />
                  {formState.handymanMinutes > 0 ? (
                    <p className="text-sm text-slate-500">Describe it in the notes box in step 5 (projector, outdoor TV, unusual device, specialty mount). We&apos;ll confirm it fits and price it before booking.</p>
                  ) : null}
                </div>
                </div>
                ) : null}
              </section>

              <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 md:p-6">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">5. Your ZIP code</h4>
                  <p className="text-sm text-slate-500">Confirms we cover your area. Notes are optional.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="quote-zip" className="text-sm font-semibold text-slate-900">ZIP code <span className="text-red-600">*</span></label>
                  <Input
                    id="quote-zip"
                    value={formState.zipCode}
                    maxLength={5}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="Enter your ZIP"
                    aria-invalid={Boolean(zipError)}
                    className={cn("h-12 rounded-xl text-base", zipError && "border-red-400 focus-visible:ring-red-400")}
                    onBlur={() => { setZipError(/^\d{5}$/.test(formState.zipCode) ? "" : "Please enter a valid 5-digit ZIP code."); }}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 5);
                      setFormState((current) => ({ ...current, zipCode: digitsOnly }));
                      if (zipError) setZipError("");
                    }}
                  />
                  {zipError ? <p className="text-sm text-red-600">{zipError}</p> : null}
                  {travelContext ? (
                    travelContext.tier === "out_of_range" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Route review needed</span>
                        </div>
                        <p className="mt-1">This ZIP isn&apos;t in our quick lookup. We&apos;ll review distance and route fit instead of applying an automatic fee.</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                          <span>We serve {getAreaName(formState.zipCode)}</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          <p>Travel and route fit are reviewed before final booking. No automatic mileage fee is added from ZIP alone.</p>
                          {travelContext.availabilityNote ? <p className="text-xs opacity-80">{travelContext.availabilityNote}</p> : null}
                        </div>
                      </div>
                    )
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="quote-notes" className="text-sm font-semibold text-slate-900">Anything else we should know? <span className="font-normal text-slate-400">(optional)</span></label>
                  <Textarea
                    id="quote-notes"
                    value={formState.notes}
                    onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="e.g. 3rd floor apartment, parking situation, TV already unboxed, etc."
                    className="min-h-[96px] rounded-2xl bg-slate-50 text-base"
                  />
                </div>
              </section>

              <div className="sticky bottom-0 z-20 -mx-5 border-t border-slate-200 bg-white/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:-mx-8 md:px-8 md:py-4">
                <div className="flex items-center justify-between gap-3">
                  <motion.div
                    key={liveQuote.total}
                    initial={{ scale: 0.98, opacity: 0.85 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  >
                    <p className="text-xs font-medium text-slate-500 md:text-sm">Estimated total</p>
                    <p className="text-2xl font-extrabold text-slate-900 md:text-3xl">{formatPrice(liveQuote.total)}</p>
                  </motion.div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      className="h-12 rounded-2xl bg-blue-600 px-6 text-base font-bold text-white hover:bg-blue-500 md:h-14 md:px-8"
                      onClick={submitFormQuote}
                    >
                      {isZipValid ? "See My Quote" : "Next: Add ZIP"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Describe It (text) ──────────────────────────────────────── */}
            <TabsContent value="text" className="mt-6 space-y-4">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute left-[-9999px] top-auto h-0 w-0 opacity-0"
                value={honeypotValue}
                onChange={(event) => setHoneypotValue(event.target.value)}
              />
              <Textarea
                value={textInput}
                onChange={(event) => {
                  const nextValue = event.target.value.slice(0, DESCRIBE_IT_MAX_CHARS);
                  setTextInput(nextValue);
                  if (!textZipCode && !textZipTouched) {
                    const detectedZip = extractZipFromDescription(nextValue);
                    if (detectedZip) {
                      setTextZipCode(detectedZip);
                      setTextZipAutoDetected(true);
                      setTextZipError("");
                    }
                  }
                }}
                placeholder="e.g. Two TVs: a 65-inch above a brick fireplace with a full motion mount, and a bedroom TV on drywall. Add a Ring doorbell and two outdoor Arlo cameras in 30075."
                className="min-h-[160px] rounded-[28px] border-slate-200 bg-slate-50 px-4 py-4 text-base md:min-h-[220px]"
              />
              <p className="text-sm text-slate-500">
                Example: <span className="italic">&ldquo;2 TVs, one over the fireplace, hide wires in the bedroom, I already have mounts.&rdquo;</span>
              </p>
              <div className="flex items-center justify-between gap-3 text-sm">
                <label htmlFor="quote-text-zip" className="text-sm font-semibold text-slate-900">ZIP code</label>
                <span className={cn("font-semibold transition-colors", describeUsageRatio >= 1 ? "text-red-600" : describeUsageRatio >= 0.9 ? "text-amber-600" : describeUsageRatio >= 0.75 ? "text-slate-700" : "text-slate-500")}>
                  {describeCharacterCount} / {DESCRIBE_IT_MAX_CHARS}
                </span>
              </div>
              <Input
                id="quote-text-zip"
                value={textZipCode}
                maxLength={5}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="Enter your ZIP"
                className="h-12 rounded-xl"
                onBlur={() => {
                  if (!textZipCode || isValidFiveDigitZip(textZipCode)) { setTextZipError(""); return; }
                  setTextZipError("Please enter a valid 5-digit ZIP code.");
                }}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 5);
                  setTextZipTouched(true);
                  setTextZipAutoDetected(false);
                  setTextZipCode(digitsOnly);
                  if (textZipError) setTextZipError("");
                }}
              />
              {textZipAutoDetected && textZipCode ? <p className="text-xs text-slate-500">ZIP code detected from description.</p> : null}
              {textZipError ? <p className="text-sm text-red-600">{textZipError}</p> : null}
              {textTravelContext ? (
                textTravelContext.tier === "out_of_range" ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Route review needed</span>
                    </div>
                    <p className="mt-2">This ZIP isn&apos;t in our quick lookup. We&apos;ll review distance and route fit instead of applying an automatic fee.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      <span>We serve {getAreaName(textZipCode)}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Travel and route fit are reviewed before final booking. No automatic mileage fee is added from ZIP alone.</p>
                      {textTravelContext.availabilityNote ? <p className="text-xs opacity-80">{textTravelContext.availabilityNote}</p> : null}
                    </div>
                  </div>
                )
              ) : null}
              {turnstileRequired ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Quick verification</p>
                  <p className="mt-1 text-sm text-slate-500">This keeps bots from burning AI quote credits.</p>
                  <div ref={turnstileContainerRef} className="mt-3 min-h-[70px]" />
                  {turnstileError ? <p className="mt-2 text-sm text-red-600">{turnstileError}</p> : null}
                </div>
              ) : null}
              {!aiQuoteConfigLoaded ? <p className="mt-2 text-sm text-slate-500">Checking AI quote availability...</p> : null}
              {aiQuoteConfigLoaded && !aiQuoteEnabled ? <p className="mt-2 text-sm text-amber-700">AI quote requests are temporarily unavailable. You can still use the local builder.</p> : null}
              <Button
                className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white hover:bg-blue-500"
                disabled={!cleanedTextInput || !aiQuoteEnabled}
                onClick={handleDescribeItQuote}
              >
                Get My Quote
              </Button>
            </TabsContent>

            {/* ── Voice Note ──────────────────────────────────────────────── */}
            <TabsContent value="voice" className="mt-6 space-y-5">
              <input
                type="text"
                name="website-voice"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="pointer-events-none absolute left-[-9999px] top-auto h-0 w-0 opacity-0"
                value={honeypotValue}
                onChange={(event) => setHoneypotValue(event.target.value)}
              />
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-center">
                <button
                  type="button"
                  aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
                  title={isRecording ? "Stop voice recording" : "Start voice recording"}
                  onClick={toggleRecording}
                  className={cn(
                    "mx-auto flex h-24 w-24 items-center justify-center rounded-full border-8 transition-all",
                    isRecording ? "animate-pulse border-blue-200 bg-blue-600 text-white shadow-xl shadow-blue-200" : "border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:text-blue-600",
                  )}
                >
                  <Mic className="h-10 w-10" />
                </button>
                <p className="mt-4 text-sm font-semibold text-slate-900">{isRecording ? "Tap to stop" : "Tap to speak"}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {browserSupportsSpeechRecognition ? "Describe the rooms, wall types, mounts, ZIP code, and any extras." : "Voice input is unavailable in this browser."}
                </p>
              </div>

              {browserSupportsSpeechRecognition && (microphonePermission === "prompt" || microphonePermission === "unknown") ? (
                <Alert className="border-blue-200 bg-blue-50 text-blue-900">
                  <Mic className="h-4 w-4" />
                  <AlertTitle>Microphone access helps us capture your voice note</AlertTitle>
                  <AlertDescription>
                    Tap the mic and your browser should ask for permission. We only use it to turn your spoken request into a quote.
                  </AlertDescription>
                </Alert>
              ) : null}

              {microphonePermission === "denied" ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Microphone access is blocked</AlertTitle>
                  <AlertDescription>
                    Allow microphone access in your browser settings, then refresh or try again. If you&apos;d rather keep moving, Describe It works great too.
                  </AlertDescription>
                </Alert>
              ) : null}

              {voiceError ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Voice note unavailable</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{voiceError}</p>
                    <Button type="button" variant="outline" className="h-10 rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => setMode("text")}>
                      Use Describe It instead
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              {voiceTranscript ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Transcript</p>
                  <p className="text-sm leading-6 text-slate-700">{voiceTranscript}</p>
                </div>
              ) : null}

              {turnstileRequired ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Quick verification</p>
                  <p className="mt-1 text-sm text-slate-500">One quick check before we use AI for this request.</p>
                  <div ref={turnstileContainerRef} className="mt-3 min-h-[70px]" />
                  {turnstileError ? <p className="mt-2 text-sm text-red-600">{turnstileError}</p> : null}
                </div>
              ) : null}
              {!aiQuoteConfigLoaded ? <p className="mt-2 text-sm text-slate-500">Checking AI quote availability...</p> : null}
              {aiQuoteConfigLoaded && !aiQuoteEnabled ? <p className="mt-2 text-sm text-amber-700">AI quote requests are temporarily unavailable. You can still use the local builder.</p> : null}

              <Button
                className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white hover:bg-blue-500"
                disabled={!voiceTranscript.trim() || !aiQuoteEnabled}
                onClick={() => handleNarrativeQuote(voiceTranscript.trim())}
              >
                Get My Quote
              </Button>
            </TabsContent>
          </Tabs>
        </motion.div>
      ) : null}

      {step === "loading" ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="flex flex-col items-center justify-center px-6 py-20 text-center md:px-8"
        >
          <div className="rounded-full bg-blue-50 p-5 text-blue-600">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <h4 className="mt-6 text-2xl font-bold text-slate-900">Building your quote...</h4>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            We&apos;re organizing the line items, checking your setup notes, and writing the summary.
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
