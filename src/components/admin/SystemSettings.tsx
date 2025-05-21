
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSystemSettings, updateSystemSetting, SystemSetting } from "@/supabase/functions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Settings, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getSystemSettings();
        setSettings(data);
      } catch (error) {
        console.error("Error fetching system settings:", error);
        toast({
          title: "Error",
          description: "Failed to load system settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [isAdmin, toast]);

  const handleUpdateSetting = async (setting: SystemSetting, newValue: string) => {
    try {
      setSaving(prev => ({ ...prev, [setting.id]: true }));
      
      await updateSystemSetting(setting.id, newValue);
      
      // Update local state
      setSettings(prevSettings => 
        prevSettings.map(s => 
          s.id === setting.id ? { ...s, value: newValue } : s
        )
      );
      
      toast({
        title: "Success",
        description: `Setting "${setting.key}" updated successfully`,
      });
    } catch (error) {
      console.error(`Error updating setting ${setting.key}:`, error);
      toast({
        title: "Error",
        description: `Failed to update setting "${setting.key}"`,
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [setting.id]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (settings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-wide settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">No settings found</h3>
            <p className="text-muted-foreground mt-2">
              There are no system settings configured yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure system-wide settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {settings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{setting.key}</h3>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving[setting.id]}
                  onClick={() => handleUpdateSetting(setting, setting.value)}
                >
                  {saving[setting.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
              <Input
                value={setting.value}
                onChange={(e) => {
                  setSettings(prevSettings => 
                    prevSettings.map(s => 
                      s.id === setting.id ? { ...s, value: e.target.value } : s
                    )
                  );
                }}
                onBlur={(e) => handleUpdateSetting(setting, e.target.value)}
              />
              <Separator className="mt-4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
