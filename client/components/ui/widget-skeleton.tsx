import { Widget } from "./widget";
import { Skeleton } from "./skeleton";

interface WidgetSkeletonProps {
  title: string;
}

export function WidgetSkeleton({ title }: WidgetSkeletonProps) {
  return (
    <Widget title={title}>
      <Skeleton className="h-full" />
    </Widget>
  );
}
