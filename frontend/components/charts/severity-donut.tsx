'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Severity } from '@/types/alerts'

interface SeverityDonutProps {
  data: { severity: Severity; count: number }[]
}

const COLORS = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
}

export const SeverityDonut = ({ data }: SeverityDonutProps) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ severity, count }) => `${severity}: ${count}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry) => (
            <Cell key={entry.severity} fill={COLORS[entry.severity]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

