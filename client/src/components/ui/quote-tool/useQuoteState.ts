import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

import { siteConfig } from "@/config/cms";
import { formatPrice, pricingData } from "@/data/pricing-data";
import {
  buildAugmentedQuote,
  buildDisplayFlags,
  buildDisplayGroup,
  buildLocalQuoteSummary,
  cleanDescribeText,
  createDefaultStandaloneServices,
  extractJson,
  extractZipFromDescription,
  flattenQuoteItems,
  isValidFiveDigitZip,
  isValidOptionalEmail,
  isValidPhoneNumber,
  normalizeAiQuote,
  normalizeQuoteForDisplayTotals,
  quoteNeedsOutletDistanceFollowUp,
  groupContextText,
  pendingQuoteStorageKey,
  type AiQuoteConfig,
  type DisplayQuote,
  type FullAiQuoteResponse,
  type NextStepIntent,
  type OutletDistanceAnswer,
  type PendingQuoteStorage,
  type QuoteMode,
  type QuoteRequestPayload,
  type QuoteSourceMode,
  type StandaloneServices,
} from "@/components/ui/quote-tool/shared";
import {
  calculateQuote,
  createDefaultQuoteFormState,
  type QuoteFormState,
} from "@/lib/quote-calculator";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { trackEvent } from "@/lib/analytics";
import { apiRequest } from "@/lib/queryClient";
import { getTravelContext, getTravelDayLabel } from "@/lib/travel-pricing";
import type {
  MicrophonePermissionState,
  SpeechRecognitionLike,
} from "@/components/ui/quote-tool/QuoteComponents";

export type QuoteStep = "build" | "loading" | "review" | "contact" | "booking";

export const businessPhone = siteConfig.businessInfo.phone;
export const businessEmail = siteConfig.businessInfo.email;
export const telHref = `tel:${businessPhone.replace(/\D/g, "")}`;
export const mailtoHref = `mailto:${businessEmail}?subject=${encodeURIComponent("Picture Perfect TV Install quote")}`;

export function useQuoteState() {
  const [, setLocation] = useLocation();
  const seasonalTheme = useMemo(() => getSeasonalTheme(), []);

  // ── Core step / mode ──────────────────────────────────────────────────────
  const [step, setStep] = useState<QuoteStep>("build");
  const [mode, setMode] = useState<QuoteMode>("form");

  // ── Form data ─────────────────────────────────────────────────────────────
  const [formState, setFormState] = useState<QuoteFormState>(createDefaultQuoteFormState);
  const [standaloneServices, setStandaloneServices] = useState<StandaloneServices>(
    createDefaultStandaloneServices,
  );
  const [tvCountLabel, setTvCountLabel] = useState("1");
  const [activeTvId, setActiveTvId] = useState(
    () => createDefaultQuoteFormState().tvs[0]?.id ?? "",
  );

  // ── Quote ─────────────────────────────────────────────────────────────────
  const [quote, setQuote] = useState<DisplayQuote | null>(null);
  const [error, setError] = useState("");

  // ── Text / describe-it mode ───────────────────────────────────────────────
  const [textInput, setTextInput] = useState("");
  const [textZipCode, setTextZipCode] = useState("");
  const [textZipError, setTextZipError] = useState("");
  const [textZipAutoDetected, setTextZipAutoDetected] = useState(false);
  const [textZipTouched, setTextZipTouched] = useState(false);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [microphonePermission, setMicrophonePermission] =
    useState<MicrophonePermissionState>("unknown");
  const [isRecording, setIsRecording] = useState(false);

  // ── ZIP / travel ──────────────────────────────────────────────────────────
  const [zipError, setZipError] = useState("");

  // ── Promo ─────────────────────────────────────────────────────────────────
  const [promoCodeInput, setPromoCodeInput] = useState(seasonalTheme.promoCode ?? "");

  // ── Contact / quote request ───────────────────────────────────────────────
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestPayload>({
    name: "",
    phone: "",
    email: "",
  });
  const [quoteRequestError, setQuoteRequestError] = useState("");
  const [quoteRequestStatus, setQuoteRequestStatus] = useState<
    "idle" | "submitting" | "success"
  >("idle");

  // ── Next step intent ──────────────────────────────────────────────────────
  const [nextStepIntent, setNextStepIntent] = useState<NextStepIntent>(null);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  // ── Quote source ──────────────────────────────────────────────────────────
  const [quoteSourceMode, setQuoteSourceMode] = useState<QuoteSourceMode>(null);

  // ── Outlet distance ───────────────────────────────────────────────────────
  const [describeOutletAnswer, setDescribeOutletAnswer] =
    useState<OutletDistanceAnswer>(null);

  // ── AI / Turnstile ────────────────────────────────────────────────────────
  const [aiQuoteConfig, setAiQuoteConfig] = useState<AiQuoteConfig | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");

  // ── Refs ──────────────────────────────────────────────────────────────────
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // ── Computed constants ────────────────────────────────────────────────────
  const stepFlow: Array<{ key: Exclude<QuoteStep, "loading">; label: string }> = [
    { key: "build", label: "Build Quote" },
    { key: "review", label: "Review Quote" },
    { key: "contact", label: "Contact Info" },
    { key: "booking", label: "Next Step" },
  ];

  const browserSupportsSpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const liveQuote = useMemo(
    () => buildAugmentedQuote(calculateQuote(formState), standaloneServices),
    [formState, standaloneServices],
  );
  const cleanedTextInput = useMemo(() => cleanDescribeText(textInput), [textInput]);
  const describeCharacterCount = textInput.length;
  const describeUsageRatio = describeCharacterCount / 1500; // DESCRIBE_IT_MAX_CHARS

  const aiQuoteEnabled = aiQuoteConfig?.enabled ?? false;
  const turnstileRequired =
    aiQuoteConfig?.turnstileRequired ?? aiQuoteConfig?.requireTurnstile ?? false;
  const aiQuoteConfigLoaded = aiQuoteConfig !== null;

  const isZipValid = /^\d{5}$/.test(formState.zipCode);
  const isTextZipValid = isValidFiveDigitZip(textZipCode);

  const travelContext = useMemo(
    () => (isZipValid ? getTravelContext(formState.zipCode) : null),
    [formState.zipCode, isZipValid],
  );
  const textTravelContext = useMemo(
    () => (isTextZipValid ? getTravelContext(textZipCode) : null),
    [isTextZipValid, textZipCode],
  );

  const reviewGroups = useMemo(
    () =>
      quote
        ? quote.groups
            .map(buildDisplayGroup)
            .filter(
              (group) =>
                group.items.length > 0 &&
                group.items.some(
                  (item) => item.lineTotal !== 0 || item.name.trim().length > 0,
                ),
            )
        : [],
    [quote],
  );

  const reviewFlags = useMemo(() => {
    if (!quote) return [];
    const flags = buildDisplayFlags(quote.flags);
    if (quoteNeedsOutletDistanceFollowUp(quote, quoteSourceMode, cleanedTextInput)) {
      if (describeOutletAnswer === "no") {
        flags.push(
          "Because the nearest outlet is farther than 1–2 feet from the TV location, additional concealment work may be needed. We'll confirm that before the install.",
        );
      } else if (describeOutletAnswer === "not_sure") {
        flags.push(
          "Outlet distance is still unconfirmed for the standard wire concealment part of this quote. We may ask for a quick photo before finalizing pricing.",
        );
      }
    }
    return Array.from(new Set(flags));
  }, [cleanedTextInput, describeOutletAnswer, quote, quoteSourceMode]);

  const reviewDiscountLabel = useMemo(() => {
    if (!quote || quote.discount <= 0) return "Total discounts";
    const tvGroupCount = quote.groups.filter((group) =>
      group.title.startsWith("TV "),
    ).length;
    return tvGroupCount > 1
      ? `Bundle Discount (${tvGroupCount} TVs)`
      : "Bundle Discount";
  }, [quote]);

  const describeOutletFollowUpNeeded = useMemo(
    () =>
      quote
        ? quoteNeedsOutletDistanceFollowUp(quote, quoteSourceMode, cleanedTextInput)
        : false,
    [cleanedTextInput, quote, quoteSourceMode],
  );

  const reviewNeedsPhotoHelper = useMemo(() => {
    if (!quote) return false;
    const hasTrickyFlag = reviewFlags.some((flag) =>
      /\b(fireplace|brick|masonry|photo|concealment)\b/i.test(flag),
    );
    const hasTrickyGroup = reviewGroups.some((group) =>
      /\b(fireplace|brick|stone|masonry)\b/i.test(groupContextText(group)),
    );
    return hasTrickyFlag || hasTrickyGroup || describeOutletAnswer === "not_sure";
  }, [describeOutletAnswer, quote, reviewFlags, reviewGroups]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!formState.tvs.some((tv) => tv.id === activeTvId) && formState.tvs[0]) {
      setActiveTvId(formState.tvs[0].id);
    }
  }, [activeTvId, formState.tvs]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (mode !== "voice") return;
    void refreshMicrophonePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    apiRequest("GET", "/api/ai-quote/config")
      .then((response) => response.json() as Promise<AiQuoteConfig>)
      .then((config) => setAiQuoteConfig(config))
      .catch((configError) => {
        console.error("AI quote config error:", configError);
        setAiQuoteConfig({ siteKey: "", enabled: false, turnstileRequired: false });
      });
  }, []);

  useEffect(() => {
    if (
      !aiQuoteEnabled ||
      !turnstileRequired ||
      !aiQuoteConfig?.siteKey ||
      typeof window === "undefined" ||
      mode === "form"
    )
      return;
    if (document.querySelector('script[data-turnstile-script="true"]')) return;
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    document.head.appendChild(script);
  }, [aiQuoteConfig?.siteKey, aiQuoteEnabled, mode, turnstileRequired]);

  useEffect(() => {
    if (
      !aiQuoteEnabled ||
      !turnstileRequired ||
      !aiQuoteConfig?.siteKey ||
      !turnstileContainerRef.current ||
      mode === "form" ||
      step !== "build"
    )
      return;

    let cancelled = false;
    let intervalId: number | null = null;

    const renderTurnstile = () => {
      if (
        cancelled ||
        !window.turnstile ||
        !turnstileContainerRef.current ||
        turnstileWidgetIdRef.current
      )
        return;
      turnstileWidgetIdRef.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: aiQuoteConfig.siteKey,
          theme: "light",
          callback: (token: string) => {
            setTurnstileToken(token);
            setTurnstileError("");
          },
          "expired-callback": () => {
            setTurnstileToken("");
            setTurnstileError("Please complete the quick verification again.");
          },
          "error-callback": () => {
            setTurnstileToken("");
            setTurnstileError(
              "We couldn't verify the request. Please try again.",
            );
          },
        },
      );
    };

    if (window.turnstile) {
      renderTurnstile();
    } else {
      intervalId = window.setInterval(() => {
        if (window.turnstile) {
          if (intervalId !== null) window.clearInterval(intervalId);
          renderTurnstile();
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [aiQuoteConfig?.siteKey, aiQuoteEnabled, mode, step, turnstileRequired]);

  // ── Turnstile helpers ─────────────────────────────────────────────────────

  function resetTurnstileWidget() {
    setTurnstileToken("");
    setTurnstileError("");
    if (window.turnstile && turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  // ── AI quote request ──────────────────────────────────────────────────────

  async function requestProtectedAiQuote(payload: {
    message?: string;
    mode?: "text" | "voice";
    description?: string;
    zipCode?: string;
  }) {
    if (!aiQuoteConfigLoaded) {
      throw new Error(
        "AI quote availability is still loading. Please try again in a moment.",
      );
    }
    if (!aiQuoteEnabled) {
      throw new Error(
        "AI quote requests are temporarily unavailable. Please use the local builder or call us directly.",
      );
    }
    if (turnstileRequired && !turnstileToken) {
      setTurnstileError(
        "Please complete the quick verification before requesting an AI quote.",
      );
      throw new Error("Missing Turnstile verification.");
    }
    const response = await apiRequest("POST", "/api/ai-quote", {
      ...payload,
      turnstileToken,
      honeypot: honeypotValue,
    });
    const data = (await response.json()) as { content?: string };
    if (!data.content) {
      throw new Error("The AI quote service returned an empty response.");
    }
    resetTurnstileWidget();
    return data.content;
  }

  // ── Quote handlers ────────────────────────────────────────────────────────

  async function handleFormQuote() {
    trackEvent("quote_interaction", { mode: "form" });
    if (!isZipValid) {
      setZipError("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setError("");
    setQuoteRequestError("");
    setQuoteRequestStatus("idle");
    setNextStepIntent(null);
    setStep("loading");
    try {
      setQuote(
        normalizeQuoteForDisplayTotals({
          ...liveQuote,
          summary: buildLocalQuoteSummary(liveQuote, formState, standaloneServices),
        }),
      );
      setQuoteSourceMode("form");
      setDescribeOutletAnswer(null);
      setPromoCodeInput(seasonalTheme.promoCode ?? "");
      setStep("review");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? `${submitError.message} You can try again, call ${businessPhone}, or email ${businessEmail}.`
          : `Something went wrong building the quote. You can try again, call ${businessPhone}, or email ${businessEmail}.`,
      );
      setStep("build");
    }
  }

  async function handleNarrativeQuote(prompt: string) {
    trackEvent("quote_interaction", { mode: "voice" });
    setError("");
    setQuoteRequestError("");
    setQuoteRequestStatus("idle");
    setNextStepIntent(null);
    setStep("loading");
    try {
      const raw = await requestProtectedAiQuote({
        mode: "voice",
        message: prompt,
      });
      setQuote(
        normalizeQuoteForDisplayTotals(
          normalizeAiQuote(extractJson<FullAiQuoteResponse>(raw)),
        ),
      );
      setQuoteSourceMode("voice");
      setDescribeOutletAnswer(null);
      setPromoCodeInput(seasonalTheme.promoCode ?? "");
      setStep("review");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? `${submitError.message.replace(/^\d+:\s*/, "")} You can try again, call ${businessPhone}, or email ${businessEmail}.`
          : `Something went wrong building the quote. You can try again, call ${businessPhone}, or email ${businessEmail}.`,
      );
      setStep("build");
    }
  }

  async function handleDescribeItQuote() {
    trackEvent("quote_interaction", { mode: "text" });
    setError("");
    const fallbackZip = !textZipCode ? extractZipFromDescription(textInput) : "";
    const finalZipCode = textZipCode || fallbackZip;
    const cleanedDescription = cleanDescribeText(textInput).slice(0, 1500);
    if (!cleanedDescription) {
      setError(
        "Please add a short description of the job before requesting an AI quote.",
      );
      return;
    }
    if (!isValidFiveDigitZip(finalZipCode)) {
      setTextZipError("Please enter a valid 5-digit ZIP code.");
      if (fallbackZip) {
        setTextZipCode(fallbackZip);
        setTextZipAutoDetected(true);
      }
      return;
    }
    setTextZipError("");
    setQuoteRequestError("");
    setQuoteRequestStatus("idle");
    setNextStepIntent(null);
    setFormState((current) => ({ ...current, zipCode: finalZipCode }));
    setStep("loading");
    try {
      const raw = await requestProtectedAiQuote({
        mode: "text",
        message: `ZIP: ${finalZipCode}\nRequest: ${cleanedDescription}`,
        description: cleanedDescription,
        zipCode: finalZipCode,
      });
      const nextQuote = normalizeAiQuote(extractJson<FullAiQuoteResponse>(raw));
      const nextTravelContext = getTravelContext(finalZipCode);
      setQuote(
        normalizeQuoteForDisplayTotals({
          ...nextQuote,
          travelTier: nextTravelContext.tier,
          travelFee: nextTravelContext.fee,
          travelContext: nextTravelContext,
        }),
      );
      setQuoteSourceMode("text");
      setDescribeOutletAnswer(null);
      setPromoCodeInput(seasonalTheme.promoCode ?? "");
      setStep("review");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? `${submitError.message.replace(/^\d+:\s*/, "")} You can try again, call ${businessPhone}, or email ${businessEmail}.`
          : `Something went wrong building the quote. You can try again, call ${businessPhone}, or email ${businessEmail}.`,
      );
      setStep("build");
    }
  }

  function savePendingQuote(nextQuote: DisplayQuote) {
    if (typeof window === "undefined") return;
    const payload: PendingQuoteStorage = {
      total: nextQuote.total,
      summary: nextQuote.summary,
      groups: nextQuote.groups,
      flags: nextQuote.flags,
      followUp: nextQuote.followUp,
      promoCode: promoCodeInput.trim() || undefined,
    };
    window.localStorage.setItem(pendingQuoteStorageKey, JSON.stringify(payload));
  }

  function validateContactInfo(): boolean {
    if (!quoteRequest.name.trim()) {
      setQuoteRequestError("Please enter your name.");
      return false;
    }
    if (!isValidPhoneNumber(quoteRequest.phone)) {
      setQuoteRequestError("Please enter a valid phone number.");
      return false;
    }
    if (!isValidOptionalEmail(quoteRequest.email)) {
      setQuoteRequestError(
        "Please enter a valid email address or leave it blank.",
      );
      return false;
    }
    setQuoteRequestError("");
    return true;
  }

  function handleReviewApproval() {
    if (describeOutletFollowUpNeeded && !describeOutletAnswer) {
      setError(
        "Please answer the quick wire-concealment question so we can finalize the review clearly.",
      );
      return;
    }
    setError("");
    setQuoteRequestError("");
    setStep("contact");
  }

  function handleEditQuote() {
    setQuoteRequestError("");
    setQuoteRequestStatus("idle");
    setNextStepIntent(null);
    setError("");
    setStep("build");
  }

  function handleScheduleNow() {
    if (!quote) return;
    if (!validateContactInfo()) return;
    savePendingQuote(quote);
    setNextStepIntent("schedule");
    setStep("booking");
  }

  async function handleFollowUpRequest(
    intent: Exclude<NextStepIntent, "schedule" | null>,
  ) {
    if (!quote) return;
    if (!validateContactInfo()) return;
    setQuoteRequestStatus("submitting");
    setNextStepIntent(intent);
    try {
      const followUpPreference =
        intent === "send_quote"
          ? "Customer requested this quote be sent for follow-up."
          : "Customer requested follow-up before booking.";
      const contactSummary = [
        followUpPreference,
        quoteRequest.email.trim()
          ? `Email: ${quoteRequest.email.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      await apiRequest("POST", "/api/quote-request", {
        name: quoteRequest.name.trim(),
        phone: quoteRequest.phone.trim(),
        quoteTotal: quote.total,
        quoteItems: flattenQuoteItems(quote.groups),
        quoteSummary: [quote.summary, contactSummary].filter(Boolean).join("\n\n"),
        zipCode: formState.zipCode || "N/A",
      });
      setQuoteRequestStatus("success");
      setStep("booking");
    } catch (submitError) {
      console.error(submitError);
      setQuoteRequestStatus("idle");
      setQuoteRequestError(
        "We couldn't send that quote just now. Please call or email us and we'll take it from there.",
      );
    }
  }

  async function copyPhoneNumber() {
    try {
      await navigator.clipboard.writeText(businessPhone);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (copyError) {
      console.error(copyError);
    }
  }

  function resetTool() {
    recognitionRef.current?.abort();
    setIsRecording(false);
    setError("");
    setQuote(null);
    setTextInput("");
    setTextZipCode("");
    setTextZipError("");
    setTextZipAutoDetected(false);
    setTextZipTouched(false);
    setVoiceTranscript("");
    setVoiceError("");
    setMicrophonePermission("unknown");
    setZipError("");
    setStandaloneServices(createDefaultStandaloneServices());
    setQuoteRequest({ name: "", phone: "", email: "" });
    setQuoteRequestError("");
    setQuoteRequestStatus("idle");
    setNextStepIntent(null);
    setCopyStatus("idle");
    setQuoteSourceMode(null);
    setDescribeOutletAnswer(null);
    const nextState = createDefaultQuoteFormState();
    setFormState(nextState);
    setActiveTvId(nextState.tvs[0]?.id ?? "");
    setTvCountLabel("1");
    setMode("form");
    setPromoCodeInput(seasonalTheme.promoCode ?? "");
    setStep("build");
  }

  // ── Microphone helpers ────────────────────────────────────────────────────

  async function refreshMicrophonePermission(): Promise<MicrophonePermissionState> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicrophonePermission("unsupported");
      return "unsupported";
    }
    if (!navigator.permissions?.query) {
      setMicrophonePermission("unknown");
      return "unknown";
    }
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      const nextState = permissionStatus.state as MicrophonePermissionState;
      setMicrophonePermission(nextState);
      return nextState;
    } catch {
      setMicrophonePermission("unknown");
      return "unknown";
    }
  }

  async function requestMicrophoneAccess(): Promise<boolean> {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicrophonePermission("unsupported");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission("granted");
      return true;
    } catch (requestError) {
      const errorName =
        requestError instanceof DOMException ? requestError.name : "";
      setMicrophonePermission(
        errorName === "NotAllowedError" || errorName === "PermissionDeniedError"
          ? "denied"
          : "unknown",
      );
      return false;
    }
  }

  async function toggleRecording() {
    if (!browserSupportsSpeechRecognition) {
      setVoiceError(
        "Voice quotes are not supported in this browser. Please use the builder or type your request instead.",
      );
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(
        "Voice quotes are not supported in this browser. Please use the builder or type your request instead.",
      );
      return;
    }
    let permissionState = microphonePermission;
    if (permissionState === "unknown") {
      permissionState = await refreshMicrophonePermission();
    }
    if (permissionState === "denied") {
      setVoiceError(
        "Microphone access is blocked right now. Allow microphone access in your browser settings, then refresh or try again. If you want to keep moving, use Describe It instead.",
      );
      return;
    }
    if (permissionState === "unsupported") {
      setVoiceError(
        "This browser doesn't expose microphone access the way voice quotes need. Please use Describe It instead.",
      );
      return;
    }
    if (permissionState === "prompt" || permissionState === "unknown") {
      const granted = await requestMicrophoneAccess();
      if (!granted) {
        setVoiceError(
          "We need microphone access to capture your voice note. Please allow access in your browser prompt, or use Describe It instead.",
        );
        return;
      }
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setVoiceTranscript(transcript);
      setVoiceError("");
      setMicrophonePermission("granted");
    };
    recognition.onerror = (event) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. Please allow it in your browser settings, then refresh or try again. You can also use Describe It instead."
          : "We couldn't capture your voice note. Please try again or use the text mode instead.",
      );
      if (event.error === "not-allowed") setMicrophonePermission("denied");
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setVoiceTranscript("");
    setVoiceError("");
    setIsRecording(true);
    recognition.start();
  }

  // ── Exported state object ─────────────────────────────────────────────────

  return {
    // navigation
    step, setStep, stepFlow,
    // form data
    mode, setMode,
    formState, setFormState,
    standaloneServices, setStandaloneServices,
    tvCountLabel, setTvCountLabel,
    activeTvId, setActiveTvId,
    // quote
    quote, setQuote,
    error, setError,
    // text / describe
    textInput, setTextInput,
    textZipCode, setTextZipCode,
    textZipError, setTextZipError,
    textZipAutoDetected, setTextZipAutoDetected,
    textZipTouched, setTextZipTouched,
    // voice
    voiceTranscript, voiceError, setVoiceError,
    microphonePermission, isRecording,
    // zip
    zipError, setZipError,
    // promo
    promoCodeInput, setPromoCodeInput,
    // contact
    quoteRequest, setQuoteRequest,
    quoteRequestError, quoteRequestStatus,
    // intent
    nextStepIntent,
    // copy
    copyStatus,
    // source / outlet
    quoteSourceMode,
    describeOutletAnswer, setDescribeOutletAnswer,
    // AI / turnstile
    aiQuoteConfig,
    turnstileToken, turnstileError,
    honeypotValue, setHoneypotValue,
    // refs
    recognitionRef, turnstileContainerRef, turnstileWidgetIdRef,
    // seasonal
    seasonalTheme,
    // computed
    liveQuote,
    cleanedTextInput,
    describeCharacterCount,
    describeUsageRatio,
    aiQuoteEnabled,
    turnstileRequired,
    aiQuoteConfigLoaded,
    isZipValid,
    isTextZipValid,
    travelContext,
    textTravelContext,
    reviewGroups,
    reviewFlags,
    reviewDiscountLabel,
    describeOutletFollowUpNeeded,
    reviewNeedsPhotoHelper,
    browserSupportsSpeechRecognition,
    // handlers
    handleFormQuote,
    handleNarrativeQuote,
    handleDescribeItQuote,
    handleReviewApproval,
    handleEditQuote,
    handleScheduleNow,
    handleFollowUpRequest,
    copyPhoneNumber,
    resetTool,
    toggleRecording,
    setLocation,
  };
}

export type QuoteToolState = ReturnType<typeof useQuoteState>;

// ── Context ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const QuoteToolContext = createContext<QuoteToolState>(null as any);
export const useQuoteContext = () => useContext(QuoteToolContext);
