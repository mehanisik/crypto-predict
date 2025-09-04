# React Query Migration Guide

This document outlines the migration from direct API calls to React Query's `useQuery` and `useMutation` hooks for better data fetching, caching, and state management.

## Overview

We've migrated from direct API calls using `ApiService` to React Query hooks for the following benefits:

- **Automatic caching** - Data is cached and shared across components
- **Background refetching** - Data stays fresh with automatic background updates
- **Loading and error states** - Built-in loading, error, and success states
- **Optimistic updates** - Better UX with immediate UI updates
- **Request deduplication** - Multiple components requesting the same data share one request
- **Retry logic** - Automatic retry on failure

## Available Hooks

### ML Queries (`@/hooks/use-ml-queries`)

#### `useHealth()`
Fetches API health status with 30-second stale time and 1-minute refetch interval.

```typescript
const { data, isLoading, error } = useHealth();
```

#### `useRunningTrainings()`
Fetches currently running training sessions with 10-second stale time and 30-second refetch interval.

```typescript
const { data, isLoading, error } = useRunningTrainings();
```

#### `useTrainingStatus(sessionId)`
Fetches training status for a specific session with 5-second stale time and 10-second refetch interval.

```typescript
const { data, isLoading, error } = useTrainingStatus(sessionId);
```

#### `usePrediction(params)`
Fetches prediction results with 5-minute stale time.

```typescript
const { data, isLoading, error } = usePrediction(predictionParams);
```

#### `useStartTraining()`
Mutation hook for starting a new training session.

```typescript
const startTraining = useStartTraining();

const handleStart = async (config) => {
  try {
    const result = await startTraining.mutateAsync(config);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

#### `useMakePrediction()`
Mutation hook for making predictions.

```typescript
const makePrediction = useMakePrediction();

const handlePrediction = async (params) => {
  try {
    const result = await makePrediction.mutateAsync(params);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

#### `useCancelTraining()`
Mutation hook for canceling training sessions.

```typescript
const cancelTraining = useCancelTraining();

const handleCancel = async (sessionId) => {
  try {
    await cancelTraining.mutateAsync(sessionId);
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

#### `useTrainingQueryInvalidator()`
Hook for invalidating React Query cache when WebSocket events occur.

```typescript
const queryInvalidator = useTrainingQueryInvalidator();

// Invalidate when training completes
queryInvalidator.invalidateOnTrainingComplete(sessionId);

// Invalidate when training starts
queryInvalidator.invalidateOnTrainingStart();

// Invalidate when training progress updates
queryInvalidator.invalidateOnTrainingProgress(sessionId);
```

### Market Queries (`@/hooks/use-market-queries`)

#### `useMarketStats()`
Fetches cryptocurrency market data with 30-second stale time and 1-minute refetch interval.

```typescript
const { data, isLoading, error } = useMarketStats();
```

## Migration Examples

### Before (Direct API calls)

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const result = await ApiService.getHealth();
    setData(result);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### After (React Query)

```typescript
const { data, isLoading, error } = useHealth();
```

### Before (Manual mutation handling)

```typescript
const handleStartTraining = async (config) => {
  setLoading(true);
  try {
    const result = await ApiService.startTraining(config);
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### After (React Query mutation)

```typescript
const startTraining = useStartTraining();

const handleStartTraining = async (config) => {
  try {
    const result = await startTraining.mutateAsync(config);
    // Handle success
  } catch (error) {
    // Handle error
  }
};

// Loading state is available as startTraining.isPending
```

## Query Keys

All queries use consistent query keys for proper caching:

```typescript
export const mlQueryKeys = {
  health: ['health'] as const,
  runningTrainings: ['running-trainings'] as const,
  trainingStatus: (sessionId: string) => ['training-status', sessionId] as const,
  prediction: (params: PredictionRequest) => ['prediction', params] as const,
};

export const marketQueryKeys = {
  marketStats: ['market-stats'] as const,
};
```

## Configuration

The React Query client is configured in `@/components/providers/query-provider.tsx` with the following defaults:

- **Stale time**: 5 minutes for queries, 1 second for mutations
- **Cache time**: 10 minutes
- **Retry**: 2 attempts for queries, 1 for mutations
- **Refetch on window focus**: Disabled
- **Refetch on reconnect**: Enabled

## Best Practices

1. **Use the hooks directly** - Don't wrap them in additional state management
2. **Handle loading states** - Use `isLoading`, `isPending` for better UX
3. **Handle errors gracefully** - Use `error` state to show user-friendly messages
4. **Leverage caching** - Data is automatically cached and shared
5. **Use mutations for data changes** - Use `useMutation` for POST/PUT/DELETE operations
6. **Invalidate queries when needed** - Use `queryClient.invalidateQueries()` to refresh data

## Example Component

See `@/components/examples/query-demo.tsx` for a complete example of using all the hooks with proper loading states, error handling, and data display.

## Benefits Achieved

- **Reduced boilerplate** - No more manual loading/error state management
- **Better performance** - Automatic caching and request deduplication
- **Improved UX** - Background refetching keeps data fresh
- **Type safety** - Full TypeScript support with proper types
- **Developer experience** - Better debugging with React Query DevTools
- **Real-time integration** - Seamless integration with WebSocket events
- **Automatic cache invalidation** - Cache updates when training events occur
