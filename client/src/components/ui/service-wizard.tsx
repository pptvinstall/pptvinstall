import * as React from "react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { motion, AnimatePresence } from "framer-motion"

export type ServiceQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
    nextId?: string;
    service?: string;
  }[];
}

const serviceQuestions: ServiceQuestion[] = [
  {
    id: 'tv-size',
    question: 'What size is your TV?',
    options: [
      { text: 'Under 43"', nextId: 'mount-type' },
      { text: '43" - 65"', nextId: 'mount-type' },
      { text: 'Over 65"', nextId: 'mount-type', service: 'Premium Installation' }
    ]
  },
  {
    id: 'mount-type',
    question: 'Where would you like to mount your TV?',
    options: [
      { text: 'Standard Wall', service: 'Basic TV Mounting' },
      { text: 'Above Fireplace', service: 'Premium Installation' },
      { text: 'Custom Location', service: 'Custom Solution' }
    ]
  }
];

interface ServiceWizardProps {
  onServiceSelect: (service: string) => void;
  onClose: () => void;
}

export function ServiceWizard({ onServiceSelect, onClose }: ServiceWizardProps) {
  const [currentQuestionId, setCurrentQuestionId] = React.useState('tv-size');
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({});

  const currentQuestion = serviceQuestions.find(q => q.id === currentQuestionId);

  const handleOptionSelect = (option: ServiceQuestion['options'][0]) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionId]: option.text
    }));

    if (option.service) {
      onServiceSelect(option.service);
      onClose();
    } else if (option.nextId) {
      setCurrentQuestionId(option.nextId);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">{currentQuestion?.question}</h3>
            <div className="grid gap-3">
              {currentQuestion?.options.map((option, index) => (
                <motion.div
                  key={option.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option.text}
                  </Button>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              {currentQuestionId !== 'tv-size' && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQuestionId('tv-size')}
                >
                  Start Over
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
