<?php

namespace App\Tests\Unit\EventSubscriber;

use App\Entity\User;
use App\EventSubscriber\SessionTimeoutSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

class SessionTimeoutSubscriberTest extends TestCase
{
    private TokenStorageInterface $tokenStorage;
    private SessionTimeoutSubscriber $subscriber;

    protected function setUp(): void
    {
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);
        $this->subscriber = new SessionTimeoutSubscriber($this->tokenStorage);
    }

    // =========================================================================
    // Subscription Tests
    // =========================================================================

    public function testGetSubscribedEvents(): void
    {
        $events = SessionTimeoutSubscriber::getSubscribedEvents();

        $this->assertArrayHasKey(KernelEvents::REQUEST, $events);
        $this->assertEquals(['onKernelRequest', 10], $events[KernelEvents::REQUEST]);
    }

    public function testGetSessionTimeout(): void
    {
        $timeout = SessionTimeoutSubscriber::getSessionTimeout();

        $this->assertEquals(900, $timeout); // 15 minutes
    }

    // =========================================================================
    // Public Routes Tests
    // =========================================================================

    public function testPublicRoutesBypassesCheck(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/auth/login']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testRegisterRouteIsPub lic(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/auth/register']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testVerifyEmailRouteIsPublic(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/auth/verify-email']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testPasswordResetRouteIsPublic(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/auth/password-reset/request']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testRefreshRouteIsPublic(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/auth/refresh']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testHealthRouteIsPublic(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/health']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    // =========================================================================
    // Sub-Request Tests
    // =========================================================================

    public function testSubRequestsAreIgnored(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $event = $this->createRequestEvent($request, false);

        $this->tokenStorage->expects($this->never())
            ->method('getToken');

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    // =========================================================================
    // No Token Tests
    // =========================================================================

    public function testRequestWithoutTokenPasses(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $event = $this->createRequestEvent($request);

        $this->tokenStorage->method('getToken')->willReturn(null);

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testRequestWithNonUserTokenPasses(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $event = $this->createRequestEvent($request);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn('string_user');

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    // =========================================================================
    // Session Timeout Tests
    // =========================================================================

    public function testRecentActivityPasses(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 300); // 5 minutes ago

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testExpiredSessionReturns401(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 1000); // 16+ minutes ago

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $response = $event->getResponse();
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
    }

    public function testExpiredSessionResponseContent(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 1000);

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $response = $event->getResponse();
        $content = json_decode($response->getContent(), true);

        $this->assertArrayHasKey('error', $content);
        $this->assertArrayHasKey('code', $content);
        $this->assertArrayHasKey('timeout_seconds', $content);
        $this->assertEquals('SESSION_TIMEOUT', $content['code']);
        $this->assertEquals(900, $content['timeout_seconds']);
    }

    public function testExpiredSessionClearsToken(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 1000);

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->tokenStorage->expects($this->once())
            ->method('setToken')
            ->with(null);

        $this->subscriber->onKernelRequest($event);
    }

    public function testExactTimeoutThresholdIsExpired(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 900); // Exactly 15 minutes

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        // At exact threshold, should timeout
        $this->assertInstanceOf(JsonResponse::class, $event->getResponse());
    }

    public function testJustUnderTimeoutPasses(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        $request->attributes->set('_jwt_last_activity', time() - 899); // Just under 15 minutes

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    public function testNoLastActivityAttributePasses(): void
    {
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/v1/tasks']);
        // No _jwt_last_activity attribute set

        $event = $this->createRequestEvent($request);

        $user = $this->createMock(User::class);
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $this->tokenStorage->method('getToken')->willReturn($token);

        $this->subscriber->onKernelRequest($event);

        $this->assertNull($event->getResponse());
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createRequestEvent(Request $request, bool $isMainRequest = true): RequestEvent
    {
        $kernel = $this->createMock(HttpKernelInterface::class);
        $requestType = $isMainRequest ? HttpKernelInterface::MAIN_REQUEST : HttpKernelInterface::SUB_REQUEST;

        return new RequestEvent($kernel, $request, $requestType);
    }
}
