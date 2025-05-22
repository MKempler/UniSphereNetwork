import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation as useI18nTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { generateDidAndStoreKey } from '@/lib/did';
import { LuChevronRight, LuChevronLeft, LuGlobe, LuCheck } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

// Language options - same as in LanguageSelector component
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'da', name: 'Dansk' },
  { code: 'cs', name: 'Čeština' },
  { code: 'hu', name: 'Magyar' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'he', name: 'עברית' },
  { code: 'uk', name: 'Українська' },
  { code: 'ro', name: 'Română' },
  { code: 'bg', name: 'Български' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'sr', name: 'Српски' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'et', name: 'Eesti' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'lt', name: 'Lietuvių' }
];

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username cannot exceed 30 characters").regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and periods"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  language: z.string().default("en")
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// Define the steps in the registration process
type Step = "account" | "language" | "confirmation";

export default function Register() {
  const { t } = useI18nTranslation();
  const { setUserLanguage } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("account");
  const [suggestedLanguage] = useState<string>(() => navigator.language.split('-')[0] || 'en');

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      language: suggestedLanguage
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterFormValues) => {
      return apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: () => {
      // Set the user's language preference in the TranslationContext
      setUserLanguage(form.getValues().language);
      
      toast({
        title: "Registration successful!",
        description: "Your account has been created. You can now log in.",
      });
      navigate("/login");
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: `${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    if (currentStep !== "confirmation") {
      // Move to the next step if not on the confirmation step
      if (currentStep === "account") {
        setCurrentStep("language");
      } else if (currentStep === "language") {
        setCurrentStep("confirmation");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate DID and keypair client-side
      const { did, publicJwk } = await generateDidAndStoreKey();
      // Prepare registration payload
      const payload = {
        ...values,
        did,
        publicKey: JSON.stringify(publicJwk),
        homeNode: window.location.origin // Use current origin as home node for now
      };
      
      console.log("Submitting to /api/auth/register with payload:", payload);
      
      registerMutation.mutate(payload);
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Failed to generate decentralized identity. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === "language") {
      setCurrentStep("account");
    } else if (currentStep === "confirmation") {
      setCurrentStep("language");
    }
  };

  // Step progress indicator component
  const StepIndicator = ({ step, label }: { step: Step, label: string }) => (
    <div 
      className={cn(
        "flex flex-col items-center", 
        { "opacity-50": currentStep !== step }
      )}
    >
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1",
          currentStep === step 
            ? "bg-primary text-white" 
            : "bg-neutral-200 text-neutral-600"
        )}
      >
        {currentStep === step && <LuCheck className="w-4 h-4" />}
        {currentStep !== step && (
          step === "account" ? "1" : 
          step === "language" ? "2" : "3"
        )}
      </div>
      <span className="text-xs">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-primary">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z" clipRule="evenodd" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Join UniSphere</CardTitle>
          <CardDescription>Create an account to connect with the global community</CardDescription>
          
          {/* Step progress indicator */}
          <div className="flex justify-center space-x-4 mt-4">
            <StepIndicator step="account" label="Account" />
            <div className="border-t w-8 border-neutral-300 mt-4"></div>
            <StepIndicator step="language" label="Language" />
            <div className="border-t w-8 border-neutral-300 mt-4"></div>
            <StepIndicator step="confirmation" label="Confirm" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentStep === "account" && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.fullname")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            autoComplete="name" 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.username")}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Choose a username" 
                            {...field} 
                            autoComplete="username" 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.email")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            {...field} 
                            autoComplete="email" 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.password")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Create a password" 
                            {...field} 
                            autoComplete="new-password" 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {currentStep === "language" && (
                <div className="py-2">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-lg font-semibold">Choose your preferred language</FormLabel>
                          <p className="text-sm text-muted-foreground mt-1">
                            Content in other languages will be automatically translated to your preferred language.
                            This helps you connect with users worldwide without language barriers.
                          </p>
                          <Badge variant="outline" className="mt-2 gap-1">
                            <LuGlobe className="w-3.5 h-3.5" />
                            Your language preference can be changed anytime in settings
                          </Badge>
                        </div>
                        
                        <FormControl>
                          <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-1">
                            {LANGUAGES.map((language) => (
                              <div
                                key={language.code}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                                  field.value === language.code
                                    ? "bg-primary/10 border border-primary/20"
                                    : "hover:bg-neutral-100 border border-transparent"
                                )}
                                onClick={() => field.onChange(language.code)}
                              >
                                <span className="font-medium text-sm">{language.name}</span>
                                {field.value === language.code && (
                                  <LuCheck className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {currentStep === "confirmation" && (
                <div className="py-4">
                  <h3 className="text-lg font-semibold mb-4">Confirm your details</h3>
                  
                  <div className="space-y-3 bg-neutral-50 p-4 rounded-md">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{form.getValues().name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="font-medium">@{form.getValues().username}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{form.getValues().email}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Preferred Language</p>
                      <p className="font-medium flex items-center gap-1">
                        <LuGlobe className="w-3.5 h-3.5" />
                        {LANGUAGES.find(lang => lang.code === form.getValues().language)?.name || form.getValues().language}
                      </p>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-sm text-muted-foreground">
                    By creating an account, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </div>
              )}
              
              <div className="flex justify-between mt-6">
                {currentStep !== "account" ? (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                    className="gap-1"
                  >
                    <LuChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                ) : (
                  <div></div> // Empty div to maintain layout
                )}
                
                <Button 
                  type="submit" 
                  className="gap-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : 
                    currentStep === "confirmation" ? "Create Account" : 
                    <>
                      Next
                      <LuChevronRight className="w-4 h-4" />
                    </>
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login">
              <a className="text-primary hover:underline">{t("auth.login")}</a>
            </Link>
          </div>
          <Link href="/">
            <a className="text-sm text-center text-neutral-dark hover:underline">
              Back to home
            </a>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
