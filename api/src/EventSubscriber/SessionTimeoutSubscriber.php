<?php

namespace App\EventSubscriber;

use App\Entity\User;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Event subscriber to handle session timeout and auto-logout after inactivity
 *
 * This subscriber checks if the authenticated user has been inactive for too long
 * and returns a 401 response if the session has expired.
 */
class SessionTimeoutSubscriber implements EventSubscriberInterface
{
    // Session timeout in seconds (15 minutes)
    private const SESSION_TIMEOUT_SECONDS = 900;

    public function __construct(
        private readonly TokenStorageInterface $tokenStorage,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 10],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        // Only check main requests (not sub-requests)
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();

        // Skip check for public routes
        if ($this->isPublicRoute($request->getPathInfo())) {
            return;
        }

        // Get the authenticated user
        $token = $this->tokenStorage->getToken();
        if (!$token || !$token->getUser() instanceof User) {
            return;
        }

        /** @var User $user */
        $user = $token->getUser();

        // Check last activity from JWT token claims
        // JWT tokens contain an 'iat' (issued at) claim
        // If the token is older than our timeout, we consider the session expired
        $lastActivity = $request->attributes->get('_jwt_last_activity');

        if ($lastActivity) {
            $now = new \DateTimeImmutable();
            $timeSinceActivity = $now->getTimestamp() - $lastActivity;

            if ($timeSinceActivity > self::SESSION_TIMEOUT_SECONDS) {
                // Session expired - return 401 with specific error code
                $response = new JsonResponse([
                    'error' => 'Session expired due to inactivity',
                    'code' => 'SESSION_TIMEOUT',
                    'timeout_seconds' => self::SESSION_TIMEOUT_SECONDS,
                ], Response::HTTP_UNAUTHORIZED);

                $event->setResponse($response);

                // Clear the security token
                $this->tokenStorage->setToken(null);
            }
        }
    }

    /**
     * Check if the route is public and doesn't require session timeout check
     */
    private function isPublicRoute(string $path): bool
    {
        $publicRoutes = [
            '/api/v1/auth/login',
            '/api/v1/auth/register',
            '/api/v1/auth/verify-email',
            '/api/v1/auth/resend-verification',
            '/api/v1/auth/password-reset',
            '/api/v1/auth/refresh',
            '/api/health',
        ];

        foreach ($publicRoutes as $route) {
            if (str_starts_with($path, $route)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the session timeout in seconds
     */
    public static function getSessionTimeout(): int
    {
        return self::SESSION_TIMEOUT_SECONDS;
    }
}
