import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";

export interface BaseWidgetProps {
  title: string;
  className?: string;
  headerContent?: ReactNode;
  children?: ReactNode;
  footerContent?: ReactNode;
}

export default function BaseWidget(props: BaseWidgetProps) {
  return (
    <Card
      className={cn(
        "h-full flex flex-col border rounded-lg shadow-sm",
        props.className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{props.title}</CardTitle>
        {props.headerContent && (
          <div className="flex items-center gap-2">{props.headerContent}</div>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {props.children}
      </CardContent>
      {props.footerContent && (
        <div className="mt-4 pt-2 border-t">{props.footerContent}</div>
      )}
    </Card>
  );
}
