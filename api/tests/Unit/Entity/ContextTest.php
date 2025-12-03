<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Context;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

class ContextTest extends TestCase
{
    private function createUser(): User
    {
        $user = new User();
        $user->setEmail('test@example.com');
        return $user;
    }

    // =========================================================================
    // Creation Tests
    // =========================================================================

    public function testContextCreation(): void
    {
        $context = new Context();

        $this->assertInstanceOf(Uuid::class, $context->getId());
        $this->assertInstanceOf(\DateTimeImmutable::class, $context->getCreatedAt());
        $this->assertInstanceOf(\DateTimeImmutable::class, $context->getUpdatedAt());
        $this->assertEquals(Context::STATUS_ACTIVE, $context->getStatus());
        $this->assertEquals(0, $context->getPosition());
        $this->assertFalse($context->isDefault());
        $this->assertNull($context->getUser());
        $this->assertNull($context->getIcon());
        $this->assertNull($context->getColor());
    }

    // =========================================================================
    // Name Tests
    // =========================================================================

    public function testNameGetterSetter(): void
    {
        $context = new Context();
        $name = '@Office';

        $context->setName($name);

        $this->assertEquals($name, $context->getName());
    }

    public function testNameWithDifferentContexts(): void
    {
        $context = new Context();

        $names = ['@Home', '@Phone', '@Errands', '@Computer', '@Waiting'];
        foreach ($names as $name) {
            $context->setName($name);
            $this->assertEquals($name, $context->getName());
        }
    }

    // =========================================================================
    // User Tests
    // =========================================================================

    public function testUserGetterSetter(): void
    {
        $context = new Context();
        $user = $this->createUser();

        $context->setUser($user);

        $this->assertSame($user, $context->getUser());
    }

    public function testUserCanBeNull(): void
    {
        $context = new Context();

        $this->assertNull($context->getUser());

        $context->setUser(null);
        $this->assertNull($context->getUser());
    }

    public function testUserCanBeSetThenUnset(): void
    {
        $context = new Context();
        $user = $this->createUser();

        $context->setUser($user);
        $this->assertSame($user, $context->getUser());

        $context->setUser(null);
        $this->assertNull($context->getUser());
    }

    // =========================================================================
    // Icon Tests
    // =========================================================================

    public function testIconGetterSetter(): void
    {
        $context = new Context();
        $icon = 'office-building';

        $context->setIcon($icon);

        $this->assertEquals($icon, $context->getIcon());
    }

    public function testIconCanBeNull(): void
    {
        $context = new Context();

        $this->assertNull($context->getIcon());

        $context->setIcon('some-icon');
        $context->setIcon(null);
        $this->assertNull($context->getIcon());
    }

    // =========================================================================
    // Color Tests
    // =========================================================================

    public function testColorGetterSetter(): void
    {
        $context = new Context();
        $color = '#FF5733';

        $context->setColor($color);

        $this->assertEquals($color, $context->getColor());
    }

    public function testColorCanBeNull(): void
    {
        $context = new Context();

        $this->assertNull($context->getColor());

        $context->setColor('#000000');
        $context->setColor(null);
        $this->assertNull($context->getColor());
    }

    public function testColorWithVariousFormats(): void
    {
        $context = new Context();

        $colors = ['#FFF', '#FFFFFF', '#ff5733', '#FF5733'];
        foreach ($colors as $color) {
            $context->setColor($color);
            $this->assertEquals($color, $context->getColor());
        }
    }

    // =========================================================================
    // Is Default Tests
    // =========================================================================

    public function testIsDefaultGetterSetter(): void
    {
        $context = new Context();

        $this->assertFalse($context->isDefault());

        $context->setIsDefault(true);
        $this->assertTrue($context->isDefault());

        $context->setIsDefault(false);
        $this->assertFalse($context->isDefault());
    }

    // =========================================================================
    // Status Tests
    // =========================================================================

    public function testStatusGetterSetter(): void
    {
        $context = new Context();

        foreach (Context::STATUSES as $status) {
            $context->setStatus($status);
            $this->assertEquals($status, $context->getStatus());
        }
    }

    public function testIsActive(): void
    {
        $context = new Context();

        $this->assertTrue($context->isActive());

        $context->setStatus(Context::STATUS_ARCHIVED);
        $this->assertFalse($context->isActive());

        $context->setStatus(Context::STATUS_ACTIVE);
        $this->assertTrue($context->isActive());
    }

    public function testIsArchived(): void
    {
        $context = new Context();

        $this->assertFalse($context->isArchived());

        $context->setStatus(Context::STATUS_ARCHIVED);
        $this->assertTrue($context->isArchived());

        $context->setStatus(Context::STATUS_ACTIVE);
        $this->assertFalse($context->isArchived());
    }

    public function testArchive(): void
    {
        $context = new Context();

        $this->assertTrue($context->isActive());

        $context->archive();

        $this->assertEquals(Context::STATUS_ARCHIVED, $context->getStatus());
        $this->assertTrue($context->isArchived());
    }

    public function testActivate(): void
    {
        $context = new Context();
        $context->setStatus(Context::STATUS_ARCHIVED);

        $this->assertTrue($context->isArchived());

        $context->activate();

        $this->assertEquals(Context::STATUS_ACTIVE, $context->getStatus());
        $this->assertTrue($context->isActive());
    }

    // =========================================================================
    // Position Tests
    // =========================================================================

    public function testPositionGetterSetter(): void
    {
        $context = new Context();

        $context->setPosition(5);
        $this->assertEquals(5, $context->getPosition());

        $context->setPosition(0);
        $this->assertEquals(0, $context->getPosition());

        $context->setPosition(100);
        $this->assertEquals(100, $context->getPosition());
    }

    // =========================================================================
    // Lifecycle Callback Tests
    // =========================================================================

    public function testOnPreUpdate(): void
    {
        $context = new Context();
        $originalUpdatedAt = $context->getUpdatedAt();

        usleep(1000);

        $context->onPreUpdate();

        $this->assertNotEquals($originalUpdatedAt, $context->getUpdatedAt());
        $this->assertGreaterThan($originalUpdatedAt, $context->getUpdatedAt());
    }

    // =========================================================================
    // toArray Tests
    // =========================================================================

    public function testToArray(): void
    {
        $context = new Context();
        $user = $this->createUser();
        $context->setUser($user);
        $context->setName('@Office');
        $context->setIcon('building');
        $context->setColor('#3498db');
        $context->setIsDefault(false);
        $context->setPosition(1);

        $array = $context->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertArrayHasKey('icon', $array);
        $this->assertArrayHasKey('color', $array);
        $this->assertArrayHasKey('is_default', $array);
        $this->assertArrayHasKey('status', $array);
        $this->assertArrayHasKey('position', $array);
        $this->assertArrayHasKey('created_at', $array);
        $this->assertArrayHasKey('updated_at', $array);

        $this->assertEquals('@Office', $array['name']);
        $this->assertEquals('building', $array['icon']);
        $this->assertEquals('#3498db', $array['color']);
        $this->assertFalse($array['is_default']);
        $this->assertEquals(Context::STATUS_ACTIVE, $array['status']);
        $this->assertEquals(1, $array['position']);
    }

    public function testToArrayWithMinimalData(): void
    {
        $context = new Context();
        $context->setName('@Home');

        $array = $context->toArray();

        $this->assertEquals('@Home', $array['name']);
        $this->assertNull($array['icon']);
        $this->assertNull($array['color']);
        $this->assertFalse($array['is_default']);
        $this->assertEquals(Context::STATUS_ACTIVE, $array['status']);
        $this->assertEquals(0, $array['position']);
    }

    public function testToArrayWithDefaultContext(): void
    {
        $context = new Context();
        $context->setName('@Office');
        $context->setIsDefault(true);
        // Default contexts have no user (user_id = NULL)

        $array = $context->toArray();

        $this->assertEquals('@Office', $array['name']);
        $this->assertTrue($array['is_default']);
    }

    // =========================================================================
    // Constants Tests
    // =========================================================================

    public function testStatusConstants(): void
    {
        $this->assertEquals('active', Context::STATUS_ACTIVE);
        $this->assertEquals('archived', Context::STATUS_ARCHIVED);
    }

    public function testStatusesArray(): void
    {
        $this->assertCount(2, Context::STATUSES);
        $this->assertContains(Context::STATUS_ACTIVE, Context::STATUSES);
        $this->assertContains(Context::STATUS_ARCHIVED, Context::STATUSES);
    }

    public function testDefaultContextsConstant(): void
    {
        $expectedDefaults = ['@Office', '@Home', '@Phone', '@Errands', '@Computer', '@Waiting'];

        $this->assertCount(6, Context::DEFAULT_CONTEXTS);
        foreach ($expectedDefaults as $default) {
            $this->assertContains($default, Context::DEFAULT_CONTEXTS);
        }
    }

    // =========================================================================
    // Factory Method Tests for Default Contexts
    // =========================================================================

    public function testCreateDefaultContext(): void
    {
        $context = Context::createDefault('@Office', 'building', '#3498db');

        $this->assertEquals('@Office', $context->getName());
        $this->assertEquals('building', $context->getIcon());
        $this->assertEquals('#3498db', $context->getColor());
        $this->assertTrue($context->isDefault());
        $this->assertNull($context->getUser());
        $this->assertTrue($context->isActive());
    }

    public function testCreateDefaultContextWithoutOptionals(): void
    {
        $context = Context::createDefault('@Home');

        $this->assertEquals('@Home', $context->getName());
        $this->assertNull($context->getIcon());
        $this->assertNull($context->getColor());
        $this->assertTrue($context->isDefault());
    }
}
