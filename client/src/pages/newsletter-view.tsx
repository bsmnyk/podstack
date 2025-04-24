import { useLocation, useRoute } from 'wouter'; // Use useLocation and useRoute from wouter
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SubscribedNewsletter } from '@shared/schema'; // Assuming the API returns the same structure

export default function NewsletterViewPage() {
  const [match, params] = useRoute('/newsletter/:id'); // Use useRoute to get params
  const [location, navigate] = useLocation(); // Initialize navigate from useLocation
  const { jwt } = useAuth(); // Use jwt from auth context

  const newsletterId = params?.id ? parseInt(params.id, 10) : undefined; // Access id from params

  const {
    data: newsletter,
    isLoading,
    isError,
    error,
  } = useQuery<SubscribedNewsletter>({
    queryKey: ['/api/user/subscribed-newsletters', newsletterId],
    queryFn: async () => {
      if (!jwt || newsletterId === undefined) { // Check for jwt instead of tokens?.access_token
        throw new Error('Authentication token or newsletter ID missing');
      }
      const response = await fetch(`/api/user/subscribed-newsletters/${newsletterId}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`, // Use jwt in the header
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch newsletter');
      }

      return response.json();
    },
    enabled: !!jwt && newsletterId !== undefined, // Enable query based on jwt
  });


  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center text-red-500">
            <p>Error loading newsletter: {error.message}</p>
            <Button onClick={() => navigate('/')} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <p>Newsletter not found.</p>
            <Button onClick={() => navigate('/')} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button onClick={() => navigate('/')} className="mb-4">Go Back</Button>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2">{newsletter.subject}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex justify-center items-center gap-2">
            <span>
              From: {newsletter.from} &lt;{newsletter.senderEmail}&gt;
            </span>
            <span className="mx-2">•</span>
            <span>{new Date(newsletter.date).toLocaleDateString()}</span>
          </div>
          <Separator className="my-4" />
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: newsletter.markdown || newsletter.plainText || '' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
