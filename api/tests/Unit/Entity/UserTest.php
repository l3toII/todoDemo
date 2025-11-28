<?php

namespace App\Tests\Unit\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class UserTest extends TestCase
{
    public function testUserCreation(): void
    {
        $user = new User();

        $this->assertInstanceOf(Uuid::class, $user->getId());
        $this->assertInstanceOf(\DateTimeImmutable::class, $user->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $user->getUpdatedAt());
        $this->assertEquals(User::STATUS_PENDING_VERIFICATION, $user->getStatus());
        $this->assertEquals('UTC', $user->getTimezone());
        $this->assertEquals([], $user->getNotificationPreferences());
        $this->assertNull($user->getPasswordHash());
        $this->assertNull($user->getAppleId());
        $this->assertNull($user->getVerifiedAt());
        $this->assertNull($user->getLastLoginAt());
    }

    public function testEmailGetterSetter(): void
    {
        $user = new User();
        $email = 'test@example.com';

        $user->setEmail($email);

        $this->assertEquals($email, $user->getEmail());
        $this->assertEquals($email, $user->getUserIdentifier());
    }

    public function testPasswordHashGetterSetter(): void
    {
        $user = new User();
        $hash = '$2y$13$hashedpassword';

        $user->setPasswordHash($hash);

        $this->assertEquals($hash, $user->getPasswordHash());
        $this->assertEquals($hash, $user->getPassword());
    }

    public function testAppleIdGetterSetter(): void
    {
        $user = new User();
        $appleId = '000123.abc456def789.1234';

        $user->setAppleId($appleId);

        $this->assertEquals($appleId, $user->getAppleId());
    }

    public function testStatusGetterSetter(): void
    {
        $user = new User();

        $user->setStatus(User::STATUS_ACTIVE);
        $this->assertEquals(User::STATUS_ACTIVE, $user->getStatus());
        $this->assertTrue($user->isActive());
        $this->assertFalse($user->isPendingVerification());

        $user->setStatus(User::STATUS_PENDING_VERIFICATION);
        $this->assertEquals(User::STATUS_PENDING_VERIFICATION, $user->getStatus());
        $this->assertFalse($user->isActive());
        $this->assertTrue($user->isPendingVerification());

        $user->setStatus(User::STATUS_SUSPENDED);
        $this->assertEquals(User::STATUS_SUSPENDED, $user->getStatus());
        $this->assertFalse($user->isActive());

        $user->setStatus(User::STATUS_DELETED);
        $this->assertEquals(User::STATUS_DELETED, $user->getStatus());
        $this->assertFalse($user->isActive());
    }

    public function testNotificationPreferencesGetterSetter(): void
    {
        $user = new User();
        $preferences = [
            'email_notifications' => true,
            'push_notifications' => false,
            'weekly_review_reminder' => true,
        ];

        $user->setNotificationPreferences($preferences);

        $this->assertEquals($preferences, $user->getNotificationPreferences());
    }

    public function testTimezoneGetterSetter(): void
    {
        $user = new User();
        $timezone = 'America/New_York';

        $user->setTimezone($timezone);

        $this->assertEquals($timezone, $user->getTimezone());
    }

    public function testMarkAsVerified(): void
    {
        $user = new User();
        $user->setStatus(User::STATUS_PENDING_VERIFICATION);

        $beforeTime = new \DateTimeImmutable();
        $user->markAsVerified();
        $afterTime = new \DateTimeImmutable();

        $this->assertNotNull($user->getVerifiedAt());
        $this->assertGreaterThanOrEqual($beforeTime, $user->getVerifiedAt());
        $this->assertLessThanOrEqual($afterTime, $user->getVerifiedAt());
        $this->assertEquals(User::STATUS_ACTIVE, $user->getStatus());
    }

    public function testMarkAsVerifiedDoesNotChangeActiveStatus(): void
    {
        $user = new User();
        $user->setStatus(User::STATUS_ACTIVE);

        $user->markAsVerified();

        $this->assertNotNull($user->getVerifiedAt());
        $this->assertEquals(User::STATUS_ACTIVE, $user->getStatus());
    }

    public function testUpdateLastLogin(): void
    {
        $user = new User();

        $this->assertNull($user->getLastLoginAt());

        $beforeTime = new \DateTimeImmutable();
        $user->updateLastLogin();
        $afterTime = new \DateTimeImmutable();

        $this->assertNotNull($user->getLastLoginAt());
        $this->assertGreaterThanOrEqual($beforeTime, $user->getLastLoginAt());
        $this->assertLessThanOrEqual($afterTime, $user->getLastLoginAt());
    }

    public function testLastLoginAtGetterSetter(): void
    {
        $user = new User();
        $loginTime = new \DateTimeImmutable('2024-01-01 12:00:00');

        $user->setLastLoginAt($loginTime);

        $this->assertEquals($loginTime, $user->getLastLoginAt());
    }

    public function testVerifiedAtGetterSetter(): void
    {
        $user = new User();
        $verifiedTime = new \DateTimeImmutable('2024-01-01 10:00:00');

        $user->setVerifiedAt($verifiedTime);

        $this->assertEquals($verifiedTime, $user->getVerifiedAt());
    }

    public function testUserRoles(): void
    {
        $user = new User();

        $roles = $user->getRoles();

        $this->assertIsArray($roles);
        $this->assertContains('ROLE_USER', $roles);
    }

    public function testEraseCredentials(): void
    {
        $user = new User();

        // Should not throw any exception
        $user->eraseCredentials();

        $this->assertTrue(true);
    }

    public function testOnPreUpdate(): void
    {
        $user = new User();
        $originalUpdatedAt = $user->getUpdatedAt();

        // Wait a tiny bit to ensure time difference
        usleep(1000);

        $user->onPreUpdate();

        $this->assertNotEquals($originalUpdatedAt, $user->getUpdatedAt());
        $this->assertGreaterThan($originalUpdatedAt, $user->getUpdatedAt());
    }
}
