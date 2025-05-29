import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Eye, 
  Ruler, 
  Lightbulb, 
  CheckCircle, 
  AlertTriangle,
  Download,
  RotateCcw,
  Monitor,
  Sofa,
  Home
} from 'lucide-react';

interface RoomDimensions {
  width: number;
  height: number;
  ceilingHeight: number;
}

interface FurnitureItem {
  type: 'sofa' | 'chair' | 'table' | 'fireplace' | 'window' | 'door';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface TVPlacement {
  x: number;
  y: number;
  wallHeight: number;
  viewingDistance: number;
  angle: number;
  score: number;
  issues: string[];
  benefits: string[];
}

export function TVPlacementTool() {
  const [activeTab, setActiveTab] = useState('dimensions');
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({
    width: 12,
    height: 10,
    ceilingHeight: 9
  });
  const [tvSize, setTvSize] = useState(55);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([
    {
      type: 'sofa',
      x: 6,
      y: 7,
      width: 6,
      height: 3,
      label: 'Main Sofa'
    }
  ]);
  const [selectedFurniture, setSelectedFurniture] = useState<number | null>(null);
  const [placementSuggestions, setPlacementSuggestions] = useState<TVPlacement[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate optimal TV placements based on room layout
  const calculatePlacements = useCallback(() => {
    const placements: TVPlacement[] = [];
    const { width, height, ceilingHeight } = roomDimensions;
    
    // Find main seating (largest sofa)
    const mainSeating = furniture
      .filter(item => item.type === 'sofa')
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

    if (!mainSeating) {
      return placements;
    }

    const seatX = mainSeating.x + mainSeating.width / 2;
    const seatY = mainSeating.y + mainSeating.height / 2;

    // Check each wall for TV placement
    const walls = [
      { x: 0, y: height/2, wall: 'left', direction: 'horizontal' },
      { x: width, y: height/2, wall: 'right', direction: 'horizontal' },
      { x: width/2, y: 0, wall: 'top', direction: 'vertical' },
      { x: width/2, y: height, wall: 'bottom', direction: 'vertical' }
    ];

    walls.forEach(wall => {
      const distance = Math.sqrt(
        Math.pow(wall.x - seatX, 2) + Math.pow(wall.y - seatY, 2)
      );
      
      // Optimal viewing distance is 1.5-2.5 times TV diagonal
      const tvDiagonal = tvSize;
      const minDistance = (tvDiagonal * 1.5) / 12; // Convert to feet
      const maxDistance = (tvDiagonal * 2.5) / 12;
      
      let score = 100;
      const issues: string[] = [];
      const benefits: string[] = [];
      
      // Distance scoring
      if (distance < minDistance) {
        score -= 30;
        issues.push(`Too close (${distance.toFixed(1)}ft vs recommended ${minDistance.toFixed(1)}ft+)`);
      } else if (distance > maxDistance) {
        score -= 20;
        issues.push(`Quite far (${distance.toFixed(1)}ft vs recommended max ${maxDistance.toFixed(1)}ft)`);
      } else {
        benefits.push(`Perfect viewing distance (${distance.toFixed(1)}ft)`);
      }

      // Wall suitability
      if (wall.wall === 'left' || wall.wall === 'right') {
        benefits.push('Side wall allows flexible furniture arrangement');
      }

      // Check for conflicts with other furniture
      const hasConflict = furniture.some(item => {
        if (item === mainSeating) return false;
        const itemDistance = Math.sqrt(
          Math.pow(wall.x - (item.x + item.width/2), 2) + 
          Math.pow(wall.y - (item.y + item.height/2), 2)
        );
        return itemDistance < 2;
      });

      if (hasConflict) {
        score -= 25;
        issues.push('Furniture may block view or placement');
      } else {
        benefits.push('Clear space for installation');
      }

      // Height considerations
      const recommendedHeight = 42; // inches from floor to TV center
      if (ceilingHeight < 8) {
        score -= 10;
        issues.push('Low ceiling may limit mounting options');
      } else {
        benefits.push('Good ceiling height for optimal mounting');
      }

      // Angle calculation
      const angle = Math.atan2(wall.y - seatY, wall.x - seatX) * (180 / Math.PI);
      if (Math.abs(angle) > 30) {
        score -= 15;
        issues.push('Viewing angle may cause neck strain');
      } else {
        benefits.push('Comfortable viewing angle');
      }

      placements.push({
        x: wall.x,
        y: wall.y,
        wallHeight: recommendedHeight,
        viewingDistance: distance,
        angle: Math.abs(angle),
        score: Math.max(0, score),
        issues,
        benefits
      });
    });

    return placements.sort((a, b) => b.score - a.score);
  }, [roomDimensions, tvSize, furniture]);

  // Draw room layout on canvas
  const drawRoom = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 20; // pixels per foot
    const canvasWidth = roomDimensions.width * scale;
    const canvasHeight = roomDimensions.height * scale;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw room outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

    // Draw furniture
    furniture.forEach((item, index) => {
      const x = item.x * scale;
      const y = item.y * scale;
      const width = item.width * scale;
      const height = item.height * scale;

      // Furniture color based on type
      const colors: Record<string, string> = {
        sofa: '#3b82f6',
        chair: '#10b981',
        table: '#f59e0b',
        fireplace: '#dc2626',
        window: '#06b6d4',
        door: '#8b5cf6'
      };

      ctx.fillStyle = selectedFurniture === index ? '#fbbf24' : colors[item.type];
      ctx.fillRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.label, x + 5, y + 15);
    });

    // Draw TV placement suggestions
    placementSuggestions.slice(0, 3).forEach((placement, index) => {
      const x = placement.x * scale;
      const y = placement.y * scale;
      
      // TV icon
      ctx.fillStyle = index === 0 ? '#22c55e' : index === 1 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(x - 10, y - 5, 20, 10);
      
      // Score badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`${placement.score}`, x - 8, y + 2);
    });

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= roomDimensions.width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * scale, 0);
      ctx.lineTo(i * scale, canvasHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= roomDimensions.height; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * scale);
      ctx.lineTo(canvasWidth, i * scale);
      ctx.stroke();
    }
  }, [roomDimensions, furniture, selectedFurniture, placementSuggestions]);

  // Update placements when parameters change
  React.useEffect(() => {
    const placements = calculatePlacements();
    setPlacementSuggestions(placements);
  }, [calculatePlacements]);

  // Redraw canvas when data changes
  React.useEffect(() => {
    drawRoom();
  }, [drawRoom]);

  const addFurniture = (type: FurnitureItem['type']) => {
    const newItem: FurnitureItem = {
      type,
      x: 2,
      y: 2,
      width: type === 'sofa' ? 6 : type === 'table' ? 3 : 2,
      height: type === 'sofa' ? 3 : 2,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${furniture.length + 1}`
    };
    setFurniture([...furniture, newItem]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-600 mb-2">TV Placement Visualization Tool</h2>
        <p className="text-gray-600">Design your perfect room layout and get AI-powered TV placement recommendations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dimensions">
            <Home className="w-4 h-4 mr-2" />
            Room Setup
          </TabsTrigger>
          <TabsTrigger value="furniture">
            <Sofa className="w-4 h-4 mr-2" />
            Furniture
          </TabsTrigger>
          <TabsTrigger value="visualize">
            <Eye className="w-4 h-4 mr-2" />
            Visualize
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Room Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="width">Room Width (feet)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={roomDimensions.width}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                    min="6"
                    max="30"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Room Length (feet)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={roomDimensions.height}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                    min="6"
                    max="30"
                  />
                </div>
                <div>
                  <Label htmlFor="ceiling">Ceiling Height (feet)</Label>
                  <Input
                    id="ceiling"
                    type="number"
                    value={roomDimensions.ceilingHeight}
                    onChange={(e) => setRoomDimensions(prev => ({ ...prev, ceilingHeight: Number(e.target.value) }))}
                    min="7"
                    max="12"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="tvSize">TV Size (inches)</Label>
                <Select value={tvSize.toString()} onValueChange={(value) => setTvSize(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32">32"</SelectItem>
                    <SelectItem value="43">43"</SelectItem>
                    <SelectItem value="50">50"</SelectItem>
                    <SelectItem value="55">55"</SelectItem>
                    <SelectItem value="65">65"</SelectItem>
                    <SelectItem value="75">75"</SelectItem>
                    <SelectItem value="85">85"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="furniture" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Furniture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {(['sofa', 'chair', 'table', 'fireplace', 'window', 'door'] as const).map(type => (
                  <Button
                    key={type}
                    variant="outline"
                    onClick={() => addFurniture(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-2">
                {furniture.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer ${
                      selectedFurniture === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedFurniture(selectedFurniture === index ? null : index)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="capitalize">{item.type}</Badge>
                    </div>
                    {selectedFurniture === index && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Input
                          type="number"
                          placeholder="X position"
                          value={item.x}
                          onChange={(e) => {
                            const newFurniture = [...furniture];
                            newFurniture[index].x = Number(e.target.value);
                            setFurniture(newFurniture);
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Y position"
                          value={item.y}
                          onChange={(e) => {
                            const newFurniture = [...furniture];
                            newFurniture[index].y = Number(e.target.value);
                            setFurniture(newFurniture);
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Width"
                          value={item.width}
                          onChange={(e) => {
                            const newFurniture = [...furniture];
                            newFurniture[index].width = Number(e.target.value);
                            setFurniture(newFurniture);
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Height"
                          value={item.height}
                          onChange={(e) => {
                            const newFurniture = [...furniture];
                            newFurniture[index].height = Number(e.target.value);
                            setFurniture(newFurniture);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualize" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Room Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg overflow-auto">
                <canvas 
                  ref={canvasRef}
                  className="border border-gray-300 rounded max-w-full"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Legend:</strong></p>
                <div className="flex flex-wrap gap-4 mt-2">
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    Best Placement
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    Good Placement
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    Poor Placement
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    Furniture
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid gap-4">
            {placementSuggestions.slice(0, 3).map((placement, index) => (
              <Card key={index} className={`border ${getScoreColor(placement.score)}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {getScoreIcon(placement.score)}
                      Option {index + 1}
                    </span>
                    <Badge className={getScoreColor(placement.score)}>
                      Score: {placement.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">Benefits:</h4>
                      <ul className="space-y-1">
                        {placement.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {placement.issues.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-2">Considerations:</h4>
                        <ul className="space-y-1">
                          {placement.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Viewing Distance:</span>
                        <div className="font-semibold">{placement.viewingDistance.toFixed(1)} ft</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Viewing Angle:</span>
                        <div className="font-semibold">{placement.angle.toFixed(0)}°</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Mount Height:</span>
                        <div className="font-semibold">{placement.wallHeight}"</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Position:</span>
                        <div className="font-semibold">({placement.x.toFixed(1)}, {placement.y.toFixed(1)})</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {placementSuggestions.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Monitor className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Ready to Install?</h3>
                  <p className="text-blue-600 mb-4">
                    Based on your room layout, we recommend Option 1 for the best viewing experience.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Schedule Professional Installation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}