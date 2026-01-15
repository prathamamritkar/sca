import { Card } from "@/components/ui/card";
import { TrendingUp, Zap, Award, Users } from "lucide-react";

interface StatsCardsProps {
  totalActions: number;
  totalCredits: number;
  averageConfidence: number;
  uniqueLocations: number;
}

const StatsCards = ({ totalActions, totalCredits, averageConfidence, uniqueLocations }: StatsCardsProps) => {
  const stats = [
    {
      label: "Total Actions Detected",
      value: totalActions.toString(),
      change: totalActions > 0 ? "+100%" : "0%",
      icon: Zap,
      color: "text-primary",
    },
    {
      label: "Energy Credits Awarded",
      value: totalCredits.toLocaleString(),
      change: totalCredits > 0 ? "+100%" : "0%",
      icon: Award,
      color: "text-success",
    },
    {
      label: "Detection Accuracy",
      value: `${averageConfidence}%`,
      change: averageConfidence >= 90 ? "Excellent" : "Good",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Campus Locations",
      value: uniqueLocations.toString(),
      change: uniqueLocations > 0 ? "Active" : "Inactive",
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                <p className="text-xs text-success">{stat.change} from last week</p>
              </div>
              <div className={`p-2 rounded-lg bg-secondary`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
