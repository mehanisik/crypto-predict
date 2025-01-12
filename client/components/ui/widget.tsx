import React, {Suspense} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";
import {WidgetSkeleton} from "@/components/ui/widget-skeleton";

export interface BaseWidgetProps {
  title: string;
  className?: string;
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export default function BaseWidget(props: BaseWidgetProps) {
  return (
     <Suspense fallback={<WidgetSkeleton title={"Loading"}/> }>
       <Card
           className={cn(
               "h-[400px] flex flex-col border rounded-lg shadow-sm bg-muted/50",
               props.className
           )}
       >
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-3">
           <CardTitle className="text-lg font-medium text-card-foreground">
             {props.title}
           </CardTitle>
           {props.headerContent && (
               <div className="flex items-center gap-2">
                 {props.headerContent}
               </div>
           )}
         </CardHeader>
         <CardContent className="flex-1 min-h-0 overflow-auto px-4 pb-3">
           {props.children}
         </CardContent>
         {props.footerContent && (
             <div className="px-4 py-3 border-t">
               {props.footerContent}
             </div>
         )}
       </Card>
     </Suspense>
  );
}