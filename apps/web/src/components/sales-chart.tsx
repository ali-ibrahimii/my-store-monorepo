"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@my-store/ui-kit/components/chart";
import { formatCurrency } from "@my-store/shared-utils";

export interface SalesChartPoint {
  /** برچسب محور افقی (تاریخ شمسی) */
  label: string;
  revenue: number;
  invoiceCount: number;
}

const chartConfig = {
  revenue: {
    label: "فروش",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface SalesChartProps {
  points: SalesChartPoint[];
  title?: string;
  description?: string;
}

/** نمودار فروش روزانه — کامپوننت Chart شادcn روی recharts. */
export function SalesChart({
  points,
  title = "فروش روزانه",
  description,
}: SalesChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <BarChart accessibilityLayer data={points} margin={{ top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
