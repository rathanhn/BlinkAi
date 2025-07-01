import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Lightbulb, MessageSquareHeart, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold">BlinkAi</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/chat">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/chat">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
              Meet BlinkAi. Your Witty AI Companion.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Problem-solving with a dash of humor. Your smart, funny friend for any task, ready to help you in a blink.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/chat">Start Chatting Now</Link>
              </Button>
            </div>
          </div>
          <div className="mt-16 max-w-5xl mx-auto">
             <div className="relative rounded-xl shadow-2xl overflow-hidden">
                <Image
                    src="https://placehold.co/1200x600.png"
                    alt="BlinkAi App Screenshot"
                    width={1200}
                    height={600}
                    className="w-full"
                    data-ai-hint="chatbot interface"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
             </div>
          </div>
        </section>

        <section id="features" className="bg-card py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold">A Friend, Not Just a Tool</h2>
              <p className="mt-4 text-muted-foreground">
                BlinkAi is designed to be more than just an assistant. It's your partner in crime for creativity and productivity.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center bg-background">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center">
                    <MessageSquareHeart className="w-8 h-8" />
                  </div>
                  <CardTitle className="mt-4">Friendly Banter</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Engage in conversations that are fun and feel natural. BlinkAi's witty personality makes every interaction enjoyable.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center bg-background">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center">
                    <Lightbulb className="w-8 h-8" />
                  </div>
                  <CardTitle className="mt-4">Creative Problem-Solving</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Stuck on an idea? BlinkAi helps you brainstorm, write, and think outside the box with clever suggestions.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center bg-background">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center">
                    <Zap className="w-8 h-8" />
                  </div>
                  <CardTitle className="mt-4">Fast & Responsive</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get the help you need in a blink. BlinkAi provides quick and accurate responses to keep your workflow moving.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Blink and Think?</h2>
            <p className="mt-4 text-muted-foreground">
              Give your productivity a personality boost. It's free to get started.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/chat">Try BlinkAi Now</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-muted-foreground">
          © 2024 BlinkAi. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
