"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BaseWidget from "@/components/ui/widget";
import { Button } from "@/components/ui/button";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";

interface NewsItem {
  id: number;
  title: string;
  description: string;
  link: string;
  source: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  sentiment: number; // -1 to 1
  impact: "high" | "medium" | "low";
}

interface ForumPost {
  id: number;
  topic: string;
  author: string;
  replies: number;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  sentiment: number;
  tags: string[];
}

const mockNewsData: NewsItem[] = [
  {
    id: 1,
    title: "Bitcoin ETF Approval Expected Soon",
    description:
      "Major financial institutions are preparing for potential Bitcoin ETF approval, signaling a new era for cryptocurrency investments.",
    link: "#",
    source: "CryptoDaily",
    timestamp: "2024-12-27T14:30:00Z",
    upvotes: 523,
    downvotes: 45,
    sentiment: 0.85,
    impact: "high",
  },
  {
    id: 2,
    title: "Ethereum Layer 2 Solutions Show Promise",
    description:
      "New scaling solutions for Ethereum are demonstrating significant improvements in transaction speed and cost reduction.",
    link: "#",
    source: "BlockchainNews",
    timestamp: "2024-12-26T18:00:00Z",
    upvotes: 342,
    downvotes: 28,
    sentiment: 0.72,
    impact: "medium",
  },
  {
    id: 3,
    title: "Market Volatility Concerns Grow",
    description:
      "Analysts warn of potential market volatility as global economic uncertainties persist.",
    link: "#",
    source: "CryptoInsights",
    timestamp: "2024-12-26T12:15:00Z",
    upvotes: 234,
    downvotes: 67,
    sentiment: -0.45,
    impact: "high",
  },
];

const mockForumData: ForumPost[] = [
  {
    id: 1,
    topic: "ETF Impact Analysis",
    author: "CryptoAnalyst",
    replies: 89,
    timestamp: "2024-12-27T12:00:00Z",
    upvotes: 145,
    downvotes: 12,
    sentiment: 0.65,
    tags: ["ETF", "Bitcoin", "Analysis"],
  },
  {
    id: 2,
    topic: "Layer 2 Development Discussion",
    author: "ETHDev",
    replies: 56,
    timestamp: "2024-12-26T15:45:00Z",
    upvotes: 98,
    downvotes: 5,
    sentiment: 0.78,
    tags: ["Ethereum", "L2", "Development"],
  },
];

const getSentimentIcon = (sentiment: number) => {
  if (sentiment > 0.3)
    return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
  if (sentiment < -0.3)
    return <TrendingDownIcon className="w-4 h-4 text-red-500" />;
  return <MinusIcon className="w-4 h-4 text-yellow-500" />;
};

const getSentimentColor = (sentiment: number) => {
  if (sentiment > 0.3) return "bg-green-500/10 text-green-500";
  if (sentiment < -0.3) return "bg-red-500/10 text-red-500";
  return "bg-yellow-500/10 text-yellow-500";
};

const getImpactBadge = (impact: string) => {
  const colors = {
    high: "bg-red-500/10 text-red-500",
    medium: "bg-yellow-500/10 text-yellow-500",
    low: "bg-green-500/10 text-green-500",
  };
  return colors[impact as keyof typeof colors];
};

export default function NewsWidget() {
  // Calculate overall sentiment
  const overallSentiment =
    mockNewsData.reduce((acc, news) => acc + news.sentiment, 0) /
    mockNewsData.length;
  const sentimentPercentage = ((overallSentiment + 1) / 2) * 100;

  return (
    <BaseWidget
      title="Recent News"
      headerContent={
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              Total Market Sentiment
            </span>
            <div className="w-[200px]">
              <Progress value={sentimentPercentage} className="h-2" />
            </div>
          </div>
          <Badge
            variant="secondary"
            className={getSentimentColor(overallSentiment)}
          >
            {overallSentiment > 0
              ? "Bullish"
              : overallSentiment < 0
              ? "Bearish"
              : "Neutral"}
          </Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {mockNewsData.map((news) => (
          <Card key={news.id} className="relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 w-1 h-full ${
                news.sentiment > 0
                  ? "bg-green-500"
                  : news.sentiment < 0
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            />
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{news.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={getImpactBadge(news.impact)}
                  >
                    {news.impact}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={getSentimentColor(news.sentiment)}
                  >
                    {(news.sentiment * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">{news.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {news.timestamp}
                  </span>
                  <span className="text-muted-foreground">{news.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ThumbsUpIcon className="w-4 h-4" /> {news.upvotes}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ThumbsDownIcon className="w-4 h-4" /> {news.downvotes}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </BaseWidget>
  );
}
