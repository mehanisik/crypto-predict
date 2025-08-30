"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import trainingSchema from "@/schemas/model-training";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModelTrainingFormProps {
  onStartTraining: (data: z.infer<typeof trainingSchema>) => void;
  isTraining: boolean;
}

type FormView = "basic" | "advanced" | "presets";

const PRESET_CONFIGS = {
  "quick-test": {
    ticker: "ETH-USD",
    modelType: "CNN",
    batchSize: 32,
    lookback: 5,
    epochs: 10,
    startDate: "2023-01-01",
    endDate: "2023-06-01",
  },
  "production": {
    ticker: "BTC-USD",
    modelType: "CNN-LSTM",
    batchSize: 128,
    lookback: 30,
    epochs: 200,
    startDate: "2020-01-01",
    endDate: new Date().toISOString().split("T")[0],
  },
  "experimental": {
    ticker: "SOL-USD",
    modelType: "LSTM-CNN",
    batchSize: 64,
    lookback: 15,
    epochs: 150,
    startDate: "2021-01-01",
    endDate: "2023-12-01",
  },
};

export function ModelTrainingForm({
  onStartTraining,
  isTraining,
}: ModelTrainingFormProps) {
  const [activeView, setActiveView] = useState<FormView>("basic");
  
  const form = useForm<z.infer<typeof trainingSchema>>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      ticker: "ETH-USD",
      modelType: "CNN-LSTM",
      batchSize: 64,
      lookback: 8,
      epochs: 100,
      startDate: "2020-01-01",
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  const applyPreset = (presetKey: keyof typeof PRESET_CONFIGS) => {
    const preset = PRESET_CONFIGS[presetKey];
    console.log('Applying preset:', presetKey, preset);
    Object.entries(preset).forEach(([key, value]) => {
      form.setValue(key as keyof z.infer<typeof trainingSchema>, value);
    });
  };

  const handleSubmit = (data: z.infer<typeof trainingSchema>) => {
    console.log('Form submitted with data:', data);
    onStartTraining(data);
  };

  return (
    <div className="space-y-6">
      {/* Toggle Group for Form Views */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Mode</CardTitle>
          <CardDescription>Choose how you want to configure your model</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            value={activeView}
            onValueChange={(value) => value && setActiveView(value as FormView)}
            className="justify-start"
          >
            <ToggleGroupItem value="basic" className="px-6">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Basic
              </div>
            </ToggleGroupItem>
            <ToggleGroupItem value="advanced" className="px-6">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Advanced
              </div>
            </ToggleGroupItem>
            <ToggleGroupItem value="presets" className="px-6">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Presets
              </div>
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      {/* Preset Configuration Cards */}
      {activeView === "presets" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Configuration Presets</CardTitle>
            <CardDescription>Choose from pre-configured settings for different use cases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => applyPreset("quick-test")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Test</CardTitle>
                  <CardDescription className="text-sm">Fast training for testing</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• CNN model, 10 epochs</div>
                    <div>• 5-day lookback</div>
                    <div>• Small dataset (6 months)</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => applyPreset("production")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Production</CardTitle>
                  <CardDescription className="text-sm">Full training for production</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• CNN-LSTM model, 200 epochs</div>
                    <div>• 30-day lookback</div>
                    <div>• Large dataset (3+ years)</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => applyPreset("experimental")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Experimental</CardTitle>
                  <CardDescription className="text-sm">Advanced model testing</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• LSTM-CNN model, 150 epochs</div>
                    <div>• 15-day lookback</div>
                    <div>• Medium dataset (2 years)</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {activeView === "basic" ? "Basic Configuration" : 
             activeView === "advanced" ? "Advanced Configuration" : "Custom Configuration"}
          </CardTitle>
          <CardDescription>
            {activeView === "basic" ? "Essential parameters for model training" :
             activeView === "advanced" ? "Detailed configuration with all options" :
             "Customize your configuration after applying a preset"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className={`grid gap-4 ${
                activeView === "basic" ? "sm:grid-cols-2" : "sm:grid-cols-3"
              }`}>
                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crypto Ticker</FormLabel>
                      <FormControl>
                        <Input placeholder="ETH-USD" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the crypto symbol (e.g., BTC-USD, ETH-USD)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CNN-LSTM">CNN-LSTM</SelectItem>
                            <SelectItem value="LSTM-CNN">LSTM-CNN</SelectItem>
                            <SelectItem value="CNN">CNN</SelectItem>
                            <SelectItem value="LSTM">LSTM</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Choose model architecture</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="epochs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Epochs</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Training epochs (1-1000)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {activeView === "advanced" && (
                  <>
                    <FormField
                      control={form.control}
                      name="lookback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lookback Period</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Days to look back (1-60)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="batchSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Size</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>Training batch size (1-512)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              pattern="\d{4}-\d{2}-\d{2}"
                              placeholder="YYYY-MM-DD"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            Start date for training (YYYY-MM-DD)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              pattern="\d{4}-\d{2}-\d{2}"
                              placeholder="YYYY-MM-DD"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            End date for training (YYYY-MM-DD)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className={`${activeView === "basic" ? "sm:col-span-2" : "sm:col-span-3"}`}>
                  <Button
                    type="submit"
                    className="w-full items-center"
                    disabled={isTraining}
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      "Train Model"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModelTrainingForm;
