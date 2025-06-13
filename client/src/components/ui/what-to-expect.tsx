import { Clock, CheckCircle, Phone, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function WhatToExpect() {
  const expectations = [
    {
      icon: <Phone className="h-6 w-6 text-blue-600" />,
      title: "Confirmation Call",
      description: "We'll call you 24 hours before to confirm appointment details"
    },
    {
      icon: <Clock className="h-6 w-6 text-green-600" />,
      title: "Punctual Arrival",
      description: "Our technician arrives on time with all necessary equipment"
    },
    {
      icon: <Wrench className="h-6 w-6 text-purple-600" />,
      title: "Professional Installation",
      description: "Expert mounting with wire concealment and testing"
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
      title: "Quality Guarantee",
      description: "1-year warranty and satisfaction guarantee on all work"
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 text-center">
          What to Expect on Installation Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {expectations.map((item, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {item.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-800 text-sm">{item.title}</h4>
                <p className="text-xs text-gray-600 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}