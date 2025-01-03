"use client";

import BaseWidget from "../ui/widget";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import React from "react";

const PricePredictionWidget = () => {
  return (
    <BaseWidget title="AI Model">
      <Tabs defaultValue="predictions" className="h-full">
        <TabsList>
          <TabsTrigger value="overview">ML Model Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <span>Overview</span>
        </TabsContent>
        <TabsContent value="predictions">
          <span>Predictions</span>
        </TabsContent>
        <TabsContent value="metrics">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Precision</TableHead>
                <TableHead>Recall</TableHead>
                <TableHead>F1-Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Model 1</TableCell>
                <TableCell>89%</TableCell>
                <TableCell>89%</TableCell>
                <TableCell>90%</TableCell>
                <TableCell>89%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Model 2</TableCell>
                <TableCell>89%</TableCell>
                <TableCell>89%</TableCell>
                <TableCell>90%</TableCell>
                <TableCell>88%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="data">
          <span>Data</span>
        </TabsContent>
      </Tabs>
    </BaseWidget>
  );
};

export default PricePredictionWidget;
