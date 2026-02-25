'use client';

import {
    Review,
    useCreateReviewMutation,
    useDeleteReviewMutation,
    useGetAuthUserQuery,
    useGetPropertyReviewsQuery,
} from '@/state/api';
import { Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface PropertyReviewsProps {
  propertyId: number;
}

export function PropertyReviews({ propertyId }: PropertyReviewsProps) {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: reviews, isLoading } = useGetPropertyReviewsQuery(propertyId);
  const [createReview] = useCreateReviewMutation();
  const [deleteReview] = useDeleteReviewMutation();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  const isTenant = authUser?.userRole === 'tenant';
  const userHasReviewed = reviews?.some(
    (r) => r.tenantCognitoId === authUser?.cognitoInfo?.userId
  );

  const handleSubmitReview = async () => {
    if (!authUser?.cognitoInfo?.userId) return;

    await createReview({
      rating,
      comment: comment || undefined,
      propertyId,
      tenantCognitoId: authUser.cognitoInfo.userId,
    });

    setRating(5);
    setComment('');
  };

  const handleDeleteReview = async (reviewId: number) => {
    await deleteReview(reviewId);
  };

  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 'N/A';

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-gray-200 rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Reviews</h3>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{avgRating}</span>
          <span className="text-gray-500">({reviews?.length || 0} reviews)</span>
        </div>
      </div>

      {/* Review Form - Only for tenants who haven't reviewed */}
      {isTenant && !userHasReviewed && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Write a Review</h4>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <Button onClick={handleSubmitReview}>Submit Review</Button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews?.map((review: Review) => (
          <div key={review.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>
                    {review.tenant?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{review.tenant?.name || 'Anonymous'}</p>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
                {review.tenantCognitoId === authUser?.cognitoInfo?.userId && (
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {review.comment && (
              <p className="mt-3 text-gray-700">{review.comment}</p>
            )}
          </div>
        ))}

        {(!reviews || reviews.length === 0) && (
          <p className="text-gray-500 text-center py-8">
            No reviews yet. Be the first to review this property!
          </p>
        )}
      </div>
    </div>
  );
}
