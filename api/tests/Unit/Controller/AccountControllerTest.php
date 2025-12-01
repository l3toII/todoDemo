<?php

namespace App\Tests\Unit\Controller;

use App\Controller\AccountController;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AccountDeletionService;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

class AccountControllerTest extends TestCase
{
    private AccountDeletionService $accountDeletionService;
    private UserPasswordHasherInterface $passwordHasher;
    private UserRepository $userRepository;
    private AccountController $controller;
    private TokenStorageInterface $tokenStorage;

    protected function setUp(): void
    {
        $this->accountDeletionService = $this->createMock(AccountDeletionService::class);
        $this->passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->controller = new AccountController(
            $this->accountDeletionService,
            $this->passwordHasher,
            $this->userRepository
        );

        // Set up a mock container for AbstractController
        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(function ($id) {
            return $id === 'security.token_storage';
        });
        $container->method('get')->willReturnCallback(function ($id) {
            if ($id === 'security.token_storage') {
                return $this->tokenStorage;
            }
            return null;
        });
        $this->controller->setContainer($container);
    }

    private function setAuthenticatedUser(?User $user): void
    {
        if ($user === null) {
            $this->tokenStorage->method('getToken')->willReturn(null);
        } else {
            $token = $this->createMock(TokenInterface::class);
            $token->method('getUser')->willReturn($user);
            $this->tokenStorage->method('getToken')->willReturn($token);
        }
    }

    // =========================================================================
    // updatePreferences tests
    // =========================================================================

    public function testUpdatePreferencesReturnsUnauthorizedWhenNotAuthenticated(): void
    {
        $this->setAuthenticatedUser(null);

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => 'Europe/Paris',
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('NOT_AUTHENTICATED', $data['code']);
    }

    public function testUpdatePreferencesWithValidTimezone(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
        $user->method('getEmail')->willReturn('user@example.com');
        $user->method('getTimezone')->willReturn('Europe/Paris');
        $user->method('getNotificationPreferences')->willReturn(['email' => true]);
        $user->expects($this->once())->method('setTimezone')->with('Europe/Paris');

        $this->setAuthenticatedUser($user);

        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => 'Europe/Paris',
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Preferences updated successfully', $data['message']);
        $this->assertEquals('Europe/Paris', $data['user']['timezone']);
    }

    public function testUpdatePreferencesWithInvalidTimezone(): void
    {
        $user = $this->createMock(User::class);
        $this->setAuthenticatedUser($user);

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => 'Invalid/Timezone',
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('INVALID_TIMEZONE', $data['code']);
        $this->assertStringContainsString('not valid', $data['message']);
    }

    public function testUpdatePreferencesWithEmptyTimezone(): void
    {
        $user = $this->createMock(User::class);
        $this->setAuthenticatedUser($user);

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => '',
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('INVALID_TIMEZONE', $data['code']);
    }

    public function testUpdatePreferencesWithNotificationPreferences(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
        $user->method('getEmail')->willReturn('user@example.com');
        $user->method('getTimezone')->willReturn('UTC');
        $user->method('getNotificationPreferences')->willReturn([
            'email_reminders' => true,
            'weekly_review' => false,
        ]);
        $user->expects($this->once())->method('setNotificationPreferences')->with([
            'email_reminders' => true,
            'weekly_review' => false,
        ]);

        $this->setAuthenticatedUser($user);

        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $request = new Request([], [], [], [], [], [], json_encode([
            'notification_preferences' => [
                'email_reminders' => true,
                'weekly_review' => false,
            ],
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Preferences updated successfully', $data['message']);
    }

    public function testUpdatePreferencesWithBothTimezoneAndNotifications(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
        $user->method('getEmail')->willReturn('user@example.com');
        $user->method('getTimezone')->willReturn('America/New_York');
        $user->method('getNotificationPreferences')->willReturn(['push' => true]);
        $user->expects($this->once())->method('setTimezone')->with('America/New_York');
        $user->expects($this->once())->method('setNotificationPreferences')->with(['push' => true]);

        $this->setAuthenticatedUser($user);

        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => 'America/New_York',
            'notification_preferences' => ['push' => true],
        ]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testUpdatePreferencesWithNoChanges(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
        $user->method('getEmail')->willReturn('user@example.com');
        $user->method('getTimezone')->willReturn('UTC');
        $user->method('getNotificationPreferences')->willReturn([]);

        $this->setAuthenticatedUser($user);

        // Save should still be called even with empty payload
        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($user);

        $request = new Request([], [], [], [], [], [], json_encode([]));

        $response = $this->controller->updatePreferences($request);

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testUpdatePreferencesWithVariousValidTimezones(): void
    {
        $validTimezones = [
            'UTC',
            'America/New_York',
            'Europe/London',
            'Asia/Tokyo',
            'Australia/Sydney',
            'Pacific/Auckland',
        ];

        foreach ($validTimezones as $timezone) {
            $user = $this->createMock(User::class);
            $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
            $user->method('getEmail')->willReturn('user@example.com');
            $user->method('getTimezone')->willReturn($timezone);
            $user->method('getNotificationPreferences')->willReturn([]);
            $user->expects($this->once())->method('setTimezone')->with($timezone);

            // Reset mocks for each iteration
            $this->userRepository = $this->createMock(UserRepository::class);
            $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

            $this->controller = new AccountController(
                $this->accountDeletionService,
                $this->passwordHasher,
                $this->userRepository
            );

            $container = $this->createMock(ContainerInterface::class);
            $container->method('has')->willReturnCallback(function ($id) {
                return $id === 'security.token_storage';
            });
            $container->method('get')->willReturnCallback(function ($id) {
                if ($id === 'security.token_storage') {
                    return $this->tokenStorage;
                }
                return null;
            });
            $this->controller->setContainer($container);

            $this->setAuthenticatedUser($user);

            $this->userRepository
                ->expects($this->once())
                ->method('save')
                ->with($user);

            $request = new Request([], [], [], [], [], [], json_encode([
                'timezone' => $timezone,
            ]));

            $response = $this->controller->updatePreferences($request);

            $this->assertEquals(
                Response::HTTP_OK,
                $response->getStatusCode(),
                "Timezone '$timezone' should be valid"
            );
        }
    }

    public function testUpdatePreferencesWithVariousInvalidTimezones(): void
    {
        $invalidTimezones = [
            'Invalid/Zone',
            'NotATimezone',
            'GMT+5',  // Not a valid IANA identifier
            'US/Eastern_Invalid',
            '12345',
            'null',
        ];

        foreach ($invalidTimezones as $timezone) {
            $user = $this->createMock(User::class);

            // Reset mocks for each iteration
            $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

            $container = $this->createMock(ContainerInterface::class);
            $container->method('has')->willReturnCallback(function ($id) {
                return $id === 'security.token_storage';
            });
            $container->method('get')->willReturnCallback(function ($id) {
                if ($id === 'security.token_storage') {
                    return $this->tokenStorage;
                }
                return null;
            });
            $this->controller->setContainer($container);

            $this->setAuthenticatedUser($user);

            $request = new Request([], [], [], [], [], [], json_encode([
                'timezone' => $timezone,
            ]));

            $response = $this->controller->updatePreferences($request);

            $this->assertEquals(
                Response::HTTP_BAD_REQUEST,
                $response->getStatusCode(),
                "Timezone '$timezone' should be invalid"
            );

            $data = json_decode($response->getContent(), true);
            $this->assertEquals('INVALID_TIMEZONE', $data['code']);
        }
    }

    public function testUpdatePreferencesPersistsToDatabase(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(new \Symfony\Component\Uid\Uuid('550e8400-e29b-41d4-a716-446655440000'));
        $user->method('getEmail')->willReturn('user@example.com');
        $user->method('getTimezone')->willReturn('Europe/Berlin');
        $user->method('getNotificationPreferences')->willReturn([]);

        $this->setAuthenticatedUser($user);

        // This is the key assertion - save MUST be called
        $this->userRepository
            ->expects($this->once())
            ->method('save')
            ->with($this->identicalTo($user));

        $request = new Request([], [], [], [], [], [], json_encode([
            'timezone' => 'Europe/Berlin',
        ]));

        $this->controller->updatePreferences($request);
    }
}
