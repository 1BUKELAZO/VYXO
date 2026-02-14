
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryBar, VictoryPie, VictoryAxis, VictoryTheme, VictoryArea } from 'victory-native';
import { colors } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

interface ChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie' | 'area';
  xKey?: string;
  yKey?: string;
  title: string;
  color?: string;
  height?: number;
}

export default function AnalyticsChart({
  data,
  type,
  xKey = 'x',
  yKey = 'y',
  title,
  color = colors.primary,
  height = 200,
}: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <VictoryChart
            width={chartWidth}
            height={height}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryLine
              data={data}
              x={xKey}
              y={yKey}
              style={{
                data: { stroke: color, strokeWidth: 2 },
              }}
            />
          </VictoryChart>
        );

      case 'area':
        return (
          <VictoryChart
            width={chartWidth}
            height={height}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryArea
              data={data}
              x={xKey}
              y={yKey}
              style={{
                data: { fill: color, fillOpacity: 0.3, stroke: color, strokeWidth: 2 },
              }}
            />
          </VictoryChart>
        );

      case 'bar':
        return (
          <VictoryChart
            width={chartWidth}
            height={height}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
            domainPadding={{ x: 20 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.border, strokeDasharray: '4,4' },
              }}
            />
            <VictoryBar
              data={data}
              x={xKey}
              y={yKey}
              style={{
                data: { fill: color },
              }}
            />
          </VictoryChart>
        );

      case 'pie':
        return (
          <View style={{ alignItems: 'center' }}>
            <VictoryPie
              data={data}
              x={xKey}
              y={yKey}
              width={chartWidth}
              height={height}
              colorScale={[colors.primary, colors.secondary, colors.accent, '#4CAF50', '#FFC107']}
              style={{
                labels: { fill: colors.text, fontSize: 12 },
              }}
              labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {renderChart()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
});
