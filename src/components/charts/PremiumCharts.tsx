import React from 'react';
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  Pie, 
  PieChart, 
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';

// Configurações de cores premium
const COLORS = {
  primary: '#2CB67D',
  secondary: '#1E2A38', 
  accent: '#C4C5FF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gradient: {
    primary: ['#2CB67D', '#34D399'],
    secondary: ['#1E2A38', '#374151'],
    accent: ['#C4C5FF', '#A78BFA']
  }
};

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface PremiumAreaChartProps {
  data: ChartData[];
  title: string;
  description?: string;
  dataKey: string;
  color?: string;
  showTrend?: boolean;
  trendValue?: string;
  trendType?: 'up' | 'down' | 'neutral';
}

export const PremiumAreaChart: React.FC<PremiumAreaChartProps> = ({
  data,
  title,
  description,
  dataKey,
  color = COLORS.primary,
  showTrend = true,
  trendValue,
  trendType = 'up'
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm text-gray-600 mt-1">
                {description}
              </CardDescription>
            )}
          </div>
          {showTrend && trendValue && (
            <Badge 
              variant="secondary" 
              className={`${
                trendType === 'up' ? 'bg-green-50 text-green-700 border-green-200' :
                trendType === 'down' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {trendType === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> :
               trendType === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
              {trendValue}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any) => [`R$ ${value}`, title]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                fillOpacity={1}
                fill={`url(#gradient-${dataKey})`}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface PremiumBarChartProps {
  data: ChartData[];
  title: string;
  description?: string;
  dataKey: string;
  color?: string;
  showComparison?: boolean;
  comparisonKey?: string;
}

export const PremiumBarChart: React.FC<PremiumBarChartProps> = ({
  data,
  title,
  description,
  dataKey,
  color = COLORS.primary,
  showComparison = false,
  comparisonKey
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-gray-600 mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey={dataKey} 
                fill={color} 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              {showComparison && comparisonKey && (
                <Bar 
                  dataKey={comparisonKey} 
                  fill={COLORS.accent} 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface PremiumPieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
  description?: string;
  showLegend?: boolean;
  showLabels?: boolean;
}

export const PremiumPieChart: React.FC<PremiumPieChartProps> = ({
  data,
  title,
  description,
  showLegend = true,
  showLabels = true
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-gray-600 mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {showLegend && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 truncate">{item.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface PremiumRadialChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  title: string;
  description?: string;
  centerValue?: string;
  centerLabel?: string;
}

export const PremiumRadialChart: React.FC<PremiumRadialChartProps> = ({
  data,
  title,
  description,
  centerValue,
  centerLabel
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-gray-600 mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={data}>
              <RadialBar
                minAngle={15}
                label={{ position: 'insideStart', fill: '#fff' }}
                background
                clockWise
                dataKey="value"
              />
              <Legend iconSize={10} width={120} height={140} layout="vertical" verticalAlign="middle" />
            </RadialBarChart>
          </ResponsiveContainer>
          {centerValue && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{centerValue}</div>
                {centerLabel && (
                  <div className="text-sm text-gray-500">{centerLabel}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface PremiumLineChartProps {
  data: ChartData[];
  title: string;
  description?: string;
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
    strokeDasharray?: string;
  }>;
}

export const PremiumLineChart: React.FC<PremiumLineChartProps> = ({
  data,
  title,
  description,
  lines
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-gray-600 mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#888" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {lines.map((line, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeDasharray={line.strokeDasharray}
                  dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de KPI premium
interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ElementType;
  description?: string;
  target?: string;
  progress?: number;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  target,
  progress
}) => {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {Icon && (
              <div className={`p-2 rounded-lg ${
                changeType === 'positive' ? 'bg-green-100 text-green-600' :
                changeType === 'negative' ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          {change && (
            <Badge 
              variant="secondary"
              className={`${
                changeType === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                changeType === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {changeType === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
              {changeType === 'negative' && <TrendingDown className="w-3 h-3 mr-1" />}
              {change}
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          {target && progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Meta: {target}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Efeito visual de fundo */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
};
