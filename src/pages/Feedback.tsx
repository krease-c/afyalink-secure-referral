import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    category: "general",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to submit feedback",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { error } = await supabase.from("feedback").insert({
        user_id: session.user.id,
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your feedback has been submitted successfully!",
      });

      setFormData({ subject: "", message: "", category: "general" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Heart className="text-primary" size={32} />
                <span className="text-2xl font-bold text-foreground">AFYALINK</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Help & Feedback</h1>
          <p className="text-muted-foreground text-lg">
            We'd love to hear from you. Send us your feedback, suggestions, or report issues.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your feedback"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Please provide details about your feedback..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send size={18} />
                  Submit Feedback
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Support Info */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-bold text-foreground mb-2">Need Help?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Check our FAQ page for quick answers to common questions.
            </p>
            <Button variant="outline" onClick={() => navigate("/faq")} className="w-full">
              View FAQs
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-bold text-foreground mb-2">Contact Support</h3>
            <p className="text-muted-foreground text-sm mb-1">
              Email: support@afyalink.com
            </p>
            <p className="text-muted-foreground text-sm">
              Phone: +254 700 000 000
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
