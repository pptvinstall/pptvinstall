import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ruler, 
  Lightbulb, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Monitor,
  Sofa,
  Home,
  Target,
  Eye,
  ArrowRight,
  Star
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

  // Calculate optimal TV placements
  const calculatePlacements = useCallback(() => {
    const placements: TVPlacement[] = [];
    const { width, height, ceilingHeight } = roomDimensions;
    
    const mainSeating = furniture
      .filter(item => item.type === 'sofa')
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

    if (!mainSeating) {
      setPlacementSuggestions([]);
      return;
    }

    const seatX = mainSeating.x + mainSeating.width / 2;
    const seatY = mainSeating.y + mainSeating.height / 2;

    // Wall placements with scoring
    const walls = [
      { x: width/2, y: 0, wall: 'North Wall', direction: 'horizontal' },
      { x: width/2, y: height, wall: 'South Wall', direction: 'horizontal' },
      { x: 0, y: height/2, wall: 'West Wall', direction: 'vertical' },
      { x: width, y: height/2, wall: 'East Wall', direction: 'vertical' }
    ];

    walls.forEach((wall, index) => {
      const distance = Math.sqrt(
        Math.pow(wall.x - seatX, 2) + Math.pow(wall.y - seatY, 2)
      );
      
      // Optimal viewing distance calculation
      const optimalDistance = tvSize * 0.15; // 1.5-2.5x TV diagonal
      const distanceScore = Math.max(0, 100 - Math.abs(distance - optimalDistance) * 10);
      
      // Angle calculation
      const angle = Math.atan2(wall.y - seatY, wall.x - seatX) * (180 / Math.PI);
      const angleScore = Math.max(0, 100 - Math.abs(angle) * 2);
      
      const totalScore = (distanceScore + angleScore) / 2;
      
      const issues: string[] = [];
      const benefits: string[] = [];
      
      if (distance < optimalDistance * 0.8) {
        issues.push('TV may be too close for comfortable viewing');
      } else if (distance > optimalDistance * 1.5) {
        issues.push('TV may be too far for optimal detail viewing');
      } else {
        benefits.push('Optimal viewing distance achieved');
      }
      
      if (Math.abs(angle) < 15) {
        benefits.push('Perfect viewing angle alignment');
      } else if (Math.abs(angle) > 30) {
        issues.push('Viewing angle may cause neck strain');
      }
      
      if (totalScore > 60) {
        benefits.push('Professional installation recommended');
      }

      placements.push({
        x: wall.x,
        y: wall.y,
        wallHeight: ceilingHeight * 0.4, // TV center at 40% wall height
        viewingDistance: distance,
        angle: angle,
        score: Math.round(totalScore),
        issues,
        benefits
      });
    });

    setPlacementSuggestions(placements.sort((a, b) => b.score - a.score));
  }, [roomDimensions, tvSize, furniture]);

  // Draw room layout
  const drawRoom = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 25;
    const offsetX = 50;
    const offsetY = 50;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Room outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, roomDimensions.width * scale, roomDimensions.height * scale);

    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i < roomDimensions.width; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * scale, offsetY);
      ctx.lineTo(offsetX + i * scale, offsetY + roomDimensions.height * scale);
      ctx.stroke();
    }
    for (let i = 1; i < roomDimensions.height; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * scale);
      ctx.lineTo(offsetX + roomDimensions.width * scale, offsetY + i * scale);
      ctx.stroke();
    }

    // Furniture
    furniture.forEach((item, index) => {
      const isSelected = selectedFurniture === index;
      
      ctx.fillStyle = item.type === 'sofa' ? '#10b981' : '#6b7280';
      if (isSelected) ctx.fillStyle = '#3b82f6';
      
      ctx.fillRect(
        offsetX + item.x * scale - (item.width * scale) / 2,
        offsetY + item.y * scale - (item.height * scale) / 2,
        item.width * scale,
        item.height * scale
      );

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        item.label,
        offsetX + item.x * scale,
        offsetY + item.y * scale + 4
      );
    });

    // TV placement suggestions
    placementSuggestions.slice(0, 3).forEach((placement, index) => {
      const color = index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444';
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        offsetX + placement.x * scale,
        offsetY + placement.y * scale,
        8,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Score badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        placement.score.toString(),
        offsetX + placement.x * scale,
        offsetY + placement.y * scale + 3
      );
    });

  }, [roomDimensions, furniture, selectedFurniture, placementSuggestions]);

  useEffect(() => {
    drawRoom();
  }, [drawRoom]);

  useEffect(() => {
    calculatePlacements();
  }, [calculatePlacements]);

  const addFurniture = (type: FurnitureItem['type']) => {
    const newItem: FurnitureItem = {
      type,
      x: roomDimensions.width / 2,
      y: roomDimensions.height / 2,
      width: type === 'sofa' ? 6 : type === 'table' ? 4 : 2,
      height: type === 'sofa' ? 3 : 2,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${furniture.length + 1}`
    };
    setFurniture([...furniture, newItem]);
  };

  const resetRoom = () => {
    setFurniture([{
      type: 'sofa',
      x: 6,
      y: 7,
      width: 6,
      height: 3,
      label: 'Main Sofa'
    }]);
    setSelectedFurniture(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="border-2 border-blue-100 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="flex items-center gap-3 text-2xl text-blue-700">
            <Monitor className="h-8 w-8" />
            Interactive Room Designer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-50 border-b">
              <TabsTrigger value="dimensions" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Room Setup
              </TabsTrigger>
              <TabsTrigger value="furniture" className="flex items-center gap-2">
                <Sofa className="h-4 w-4" />
                Furniture
              </TabsTrigger>
              <TabsTrigger value="visualize" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visualize
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggestions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dimensions" className="p-8">
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Room Dimensions</h3>
                  <p className="text-gray-600">Enter your room measurements to get started</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div>
                          <Label htmlFor="width" className="text-sm font-medium text-gray-700">
                            Room Width (feet)
                          </Label>
                          <Input
                            id="width"
                            type="number"
                            value={roomDimensions.width}
                            onChange={(e) => setRoomDimensions(prev => ({
                              ...prev,
                              width: Number(e.target.value)
                            }))}
                            className="mt-2"
                            min="8"
                            max="30"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="height" className="text-sm font-medium text-gray-700">
                            Room Length (feet)
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            value={roomDimensions.height}
                            onChange={(e) => setRoomDimensions(prev => ({
                              ...prev,
                              height: Number(e.target.value)
                            }))}
                            className="mt-2"
                            min="8"
                            max="30"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ceiling" className="text-sm font-medium text-gray-700">
                            Ceiling Height (feet)
                          </Label>
                          <Input
                            id="ceiling"
                            type="number"
                            value={roomDimensions.ceilingHeight}
                            onChange={(e) => setRoomDimensions(prev => ({
                              ...prev,
                              ceilingHeight: Number(e.target.value)
                            }))}
                            className="mt-2"
                            min="7"
                            max="12"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div>
                        <Label htmlFor="tvSize" className="text-sm font-medium text-gray-700">
                          TV Size (inches)
                        </Label>
                        <Select value={tvSize.toString()} onValueChange={(value) => setTvSize(Number(value))}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="43">43"</SelectItem>
                            <SelectItem value="50">50"</SelectItem>
                            <SelectItem value="55">55"</SelectItem>
                            <SelectItem value="65">65"</SelectItem>
                            <SelectItem value="75">75"</SelectItem>
                            <SelectItem value="85">85"</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Quick Tips</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Measure wall-to-wall for accurate dimensions</li>
                            <li>• Consider ceiling fans and light fixtures</li>
                            <li>• Account for baseboards and crown molding</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-center">
                  <Button onClick={() => setActiveTab('furniture')} className="bg-blue-600 hover:bg-blue-700">
                    Next: Add Furniture
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="furniture" className="p-8">
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Furniture Placement</h3>
                  <p className="text-gray-600">Add your existing furniture to optimize TV placement</p>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button variant="outline" onClick={() => addFurniture('sofa')} className="flex items-center gap-2">
                    <Sofa className="h-4 w-4" />
                    Add Sofa
                  </Button>
                  <Button variant="outline" onClick={() => addFurniture('chair')} className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Add Chair
                  </Button>
                  <Button variant="outline" onClick={() => addFurniture('table')} className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Add Table
                  </Button>
                  <Button variant="outline" onClick={resetRoom} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Room Layout</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <canvas 
                        ref={canvasRef}
                        width={500}
                        height={400}
                        className="border border-gray-200 rounded-lg w-full"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Furniture List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {furniture.map((item, index) => (
                          <div 
                            key={index}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedFurniture === index 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedFurniture(selectedFurniture === index ? null : index)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.label}</span>
                              <Badge variant="secondary">
                                {item.width}' × {item.height}'
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-center">
                  <Button onClick={() => setActiveTab('visualize')} className="bg-blue-600 hover:bg-blue-700">
                    Next: View Layout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visualize" className="p-8">
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Room Visualization</h3>
                  <p className="text-gray-600">See your room layout with TV placement suggestions</p>
                </div>
                
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <canvas 
                      ref={canvasRef}
                      width={700}
                      height={500}
                      className="border border-gray-200 rounded-lg w-full mx-auto"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                    
                    <div className="mt-6 flex justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Best Placement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Good Alternative</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Consider Carefully</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="text-center">
                  <Button onClick={() => setActiveTab('suggestions')} className="bg-blue-600 hover:bg-blue-700">
                    Get Recommendations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="p-8">
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Recommendations</h3>
                  <p className="text-gray-600">Expert placement suggestions based on your room layout</p>
                </div>
                
                {placementSuggestions.length > 0 ? (
                  <div className="grid gap-6">
                    {placementSuggestions.slice(0, 3).map((placement, index) => (
                      <Card key={index} className={`border-2 ${
                        index === 0 ? 'border-green-200 bg-green-50' : 
                        index === 1 ? 'border-yellow-200 bg-yellow-50' : 
                        'border-red-200 bg-red-50'
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                                index === 0 ? 'bg-green-500' : 
                                index === 1 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              } text-white font-bold text-lg`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {index === 0 ? 'Recommended' : index === 1 ? 'Alternative' : 'Possible'} Placement
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-gray-600">Score: {placement.score}/100</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={
                              index === 0 ? 'bg-green-100 text-green-800' : 
                              index === 1 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }>
                              {index === 0 ? 'Best' : index === 1 ? 'Good' : 'Fair'}
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Benefits
                              </h5>
                              <ul className="space-y-2">
                                {placement.benefits.map((benefit, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {placement.issues.length > 0 && (
                              <div>
                                <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  Considerations
                                </h5>
                                <ul className="space-y-2">
                                  {placement.issues.map((issue, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Viewing Distance:</span> {placement.viewingDistance.toFixed(1)} feet
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-gray-200">
                    <CardContent className="p-8 text-center">
                      <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Add Furniture to Get Started</h4>
                      <p className="text-gray-600">Add at least one sofa to receive placement recommendations</p>
                    </CardContent>
                  </Card>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3">Ready for Professional Installation?</h4>
                  <p className="text-blue-700 mb-4">
                    Get expert TV mounting services from Picture Perfect TV Install. Our certified technicians 
                    ensure safe, secure, and aesthetically pleasing installations.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Schedule Installation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}