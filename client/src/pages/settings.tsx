import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/components/ui/theme-provider";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function Settings() {
  const { user, logout, isAuthenticating } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [downloadQuality, setDownloadQuality] = useState("high");
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  
  if (!user) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to access your settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => {}}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      
      {/* Account Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={`${user.name || user.username}'s avatar`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="material-icons text-4xl text-gray-600">person</span>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {user.name || user.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={logout}
            disabled={isAuthenticating}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
      
      {/* Appearance Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Theme</Label>
              <RadioGroup 
                value={theme} 
                onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                className="flex space-x-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark">Dark</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="system" />
                  <Label htmlFor="system">System</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Playback Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Playback</CardTitle>
          <CardDescription>Manage audio playback settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="autoplay">Autoplay next newsletter</Label>
            <Switch 
              id="autoplay" 
              checked={autoPlayEnabled} 
              onCheckedChange={setAutoPlayEnabled} 
            />
          </div>
          
          <Separator />
          
          <div>
            <Label className="mb-2 block">Default Playback Speed</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">0.5x</span>
              <Slider 
                value={playbackSpeed} 
                onValueChange={(value) => setPlaybackSpeed(value)} 
                min={0.5} 
                max={2} 
                step={0.25} 
                className="flex-1"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">2x</span>
            </div>
            <div className="text-center mt-1 text-sm font-medium">
              {playbackSpeed[0]}x
            </div>
          </div>
          
          <Separator />
          
          <div>
            <Label className="mb-2 block">Download Quality</Label>
            <RadioGroup 
              value={downloadQuality} 
              onValueChange={setDownloadQuality}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">Low (save data)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">High (best quality)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      {/* Notifications Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Enable notifications</Label>
            <Switch 
              id="notifications" 
              checked={notificationsEnabled} 
              onCheckedChange={setNotificationsEnabled} 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Newslettr v1.0.0
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            © 2023 Newslettr. All rights reserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
